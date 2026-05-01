const cron = require("node-cron");
const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");

const logger = {
  info: (msg, data = {}) => console.log(`[AI INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) => console.error(`[AI ERROR] ${new Date().toISOString()} - ${msg}`, error),
};

class AIEngine {
  constructor(db) {
    this.db = db;
    this.activeJob = null;
  }

  async generatePost(topic) {
    try {
      const settings = await this.db.settings.findOne({});
      const provider = settings?.ai_provider || "groq";
      let apiKey = settings?.ai_api_key;
      
      // Fallback to .env if not set in DB
      if (!apiKey) {
        apiKey = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
      }

      if (!apiKey || apiKey === "ADD_YOUR_KEY_HERE") {
        throw new Error(`API Key for ${provider} is missing. Please configure it in Settings.`);
      }

      logger.info(`Generating post about '${topic}' using ${provider}...`);

      const prompt = `
        You are an expert content writer for a premier surrogacy agency.
        Write an SEO-optimized, engaging, and professional blog post about: "${topic}".
        
        Requirements:
        1. Return ONLY valid JSON in the exact structure below, no markdown formatting blocks.
        2. "title": A catchy, SEO-friendly title.
        3. "excerpt": A short, 2-sentence summary.
        4. "content": A comprehensive HTML string containing the full blog post (use <h2>, <p>, <ul>, <strong>, etc.). Do not include <h1> or <html> tags. Make it at least 600 words.
        5. "category": Choose one of: Surrogacy, Parenthood, IVF, Egg Donation, Legal, Health.
        
        JSON Structure:
        {
          "title": "",
          "excerpt": "",
          "content": "",
          "category": ""
        }
      `;

      let generatedJsonText = "";

      if (provider === "gemini") {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        generatedJsonText = response.text;
      } else {
        // Groq uses Llama 3 (Open Source model running on Groq's fast inference engine)
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama3-70b-8192",
          temperature: 0.7,
        });
        generatedJsonText = response.choices[0]?.message?.content || "";
      }

      // Clean the response (sometimes AI wraps JSON in markdown blocks)
      const cleanedJson = generatedJsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const blogData = JSON.parse(cleanedJson);

      // Generate a relevant image URL using Unsplash Source API
      const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(blogData.category || "family")}`;

      const newPost = {
        title: blogData.title,
        excerpt: blogData.excerpt,
        content: blogData.content,
        category: blogData.category || "Surrogacy",
        author: "AI Content Manager",
        image_url: imageUrl,
        status: "published",
        published_at: new Date(),
        created_at: new Date(),
      };

      await this.db.blog_posts.insert(newPost);
      
      await this.db.ai_logs.insert({
        action: "generated",
        topic: topic,
        status: "success",
        message: `Successfully generated and published: ${blogData.title}`,
        created_at: new Date()
      });

      return newPost;
    } catch (error) {
      logger.error("Generation failed", error);
      await this.db.ai_logs.insert({
        action: "generated",
        topic: topic || "Auto-schedule",
        status: "failed",
        message: error.message,
        created_at: new Date()
      });
      throw error;
    }
  }

  async startCron() {
    // Check settings on startup
    const settings = await this.db.settings.findOne({});
    const isEnabled = settings?.ai_auto_posting === 'enabled';
    
    if (this.activeJob) {
      this.activeJob.stop();
    }

    if (isEnabled) {
      logger.info("AI Auto-posting is ENABLED. Scheduling daily job...");
      // Run every day at 10:00 AM server time
      this.activeJob = cron.schedule("0 10 * * *", async () => {
        logger.info("Cron triggered: Starting daily AI blog generation");
        const topicsString = settings?.ai_topics || "Surrogacy benefits, The surrogacy journey, Finding a surrogate, IVF tips, Egg donation process";
        const topics = topicsString.split(",").map(t => t.trim()).filter(t => t);
        
        // Pick a random topic from the list
        const randomTopic = topics[Math.floor(Math.random() * topics.length)] || "Surrogacy tips";
        
        try {
          await this.generatePost(randomTopic);
        } catch (err) {
          logger.error("Daily cron generation failed", err);
        }
      });
    } else {
      logger.info("AI Auto-posting is DISABLED.");
    }
  }
}

module.exports = AIEngine;
