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

  async generatePost(topic, forceCategory = null, context = "") {
    try {
      const settings = await this.db.settings.findOne({});
      const provider = settings?.ai_provider || "groq";
      let apiKey = settings?.ai_api_key;
      
      // Fallback to .env if not set in DB
      if (!apiKey) {
        if (provider === "gemini") apiKey = process.env.GEMINI_API_KEY;
        else if (provider === "openai") apiKey = process.env.OPENAI_API_KEY;
        else apiKey = process.env.GROQ_API_KEY;
      }

      if (!apiKey || apiKey === "ADD_YOUR_KEY_HERE") {
        throw new Error(`API Key for ${provider} is missing. Please configure it in Settings.`);
      }

      logger.info(`Generating post about '${topic}' using ${provider}...`);

      const isFictional = forceCategory === "Fictional Story";
      
      const prompt = `
        You are a world-class SEO content strategist and creative storyteller for GEB Surrogacy Services.
        Your goal is to write a blog post that feels human, deeply emotional, and highly professional.
        
        Topic: "${topic}"
        Category: ${forceCategory || "Surrogacy"}

        Tone Guidelines:
        - Avoid repetitive introductory phrases.
        - Use a mix of short, punchy sentences and longer, descriptive ones.
        - For EDUCATIONAL posts: Be authoritative, compassionate, and informative.
        - For FICTIONAL stories: Use vivid imagery and focused storytelling.
        
        Structure Guidelines:
        - Use varied HTML structures: <h2> and <h3> for hierarchy, <p> for flow, <ul>/<li> for readability, and <blockquote> for impact.
        - Integrate 1-2 natural internal links using <a href="/become-a-surrogate" class="text-[#f8a4b9] font-bold underline">Become a Surrogate</a> or <a href="/contact" class="text-[#f8a4b9] font-bold underline">Book a Consultation</a>.
        - Length: At least 1000 words.

        Return ONLY valid JSON:
        {
          "title": "A unique, non-generic title",
          "excerpt": "A high-conversion meta description (2 sentences)",
          "content": "Full HTML string with diverse formatting",
          "category": "One of: Surrogacy, Parenthood, IVF, Egg Donation, Legal, Health, Fictional Story",
          "image_keywords": "3-4 specific visual keywords for a premium photo"
        }
      `;

      let generatedJsonText = "";

      if (provider === "openai") {
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        });
        generatedJsonText = response.choices[0]?.message?.content || "";
      } else if (provider === "gemini") {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
        });
        generatedJsonText = response.text;
      } else {
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.8,
        });
        generatedJsonText = response.choices[0]?.message?.content || "";
      }

      // Clean the response (sometimes AI wraps JSON in markdown blocks)
      const cleanedJson = generatedJsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const blogData = JSON.parse(cleanedJson);

      // Better Image Logic: Use Unsplash for more professional photos
      const keywords = blogData.image_keywords || blogData.category || "surrogacy baby family";
      const imageUrl = `https://source.unsplash.com/1200x800/?${encodeURIComponent(keywords.toLowerCase().replace(/,/g, ""))}`;

      const newPost = {
        title: blogData.title,
        excerpt: blogData.excerpt,
        content: blogData.content,
        category: blogData.category || (isFictional ? "Fictional Story" : "Surrogacy"),
        author: "GEB Surrogacy Manager",
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
    const settings = await this.db.settings.findOne({});
    const isEnabled = settings?.ai_auto_posting === 'enabled';
    
    if (this.activeJob) {
      this.activeJob.stop();
    }

    if (isEnabled) {
      logger.info("AI Auto-posting is ENABLED. Scheduling twice daily jobs (8 AM Trends, 8 PM Fictional Episode)...");
      
      // 8:00 AM - Educational/Trending Blog Post
      cron.schedule("0 8 * * *", async () => {
        logger.info("Morning Cron: Generating Trends/Educational post");
        const currentSettings = await this.db.settings.findOne({});
        const topics = (currentSettings?.ai_topics || "Surrogacy benefits, The surrogacy journey, IVF tips").split(",").map(t => t.trim());
        const randomTopic = topics[Math.floor(Math.random() * topics.length)] || "Surrogacy benefits";
        try { await this.generatePost(randomTopic); } catch (err) { logger.error("Morning cron failed", err); }
      });

      // 8:00 PM - Fictional Story Episode
      cron.schedule("0 20 * * *", async () => {
        logger.info("Evening Cron: Generating Fictional Story Episode");
        
        // Find the most recent fictional story to provide context for episodes
        const lastStory = await this.db.blog_posts.findOne({ category: "Fictional Story" }, { sort: { created_at: -1 } });
        
        const stories = [
          "A Miracle in Lagos: Sarah's Journey",
          "Finding Hope: The Olayinka Story",
          "Cross-border Love: From London to Lagos",
          "The Gift of Life: A Surrogate's Sacrifice",
          "Modern Family: How IVF Changed Everything"
        ];
        
        const randomTopic = stories[Math.floor(Math.random() * stories.length)];
        
        // Add context to prompt if there's a previous episode
        let context = "";
        if (lastStory) {
          context = `
            The previous episode was titled "${lastStory.title}". 
            If this is a continuation of that series:
            - Link to it using <a href="/blog/${lastStory._id}">Read Previous Episode</a>.
            - Continue the plot or start a new series if the previous one reached a 'Final Episode'.
          `;
        }

        try { 
          await this.generatePost(randomTopic, "Fictional Story", context); 
        } catch (err) { 
          logger.error("Evening cron failed", err); 
        }
      });

    } else {
      logger.info("AI Auto-posting is DISABLED.");
    }
  }
}

module.exports = AIEngine;
