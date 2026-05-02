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
        You are an expert content writer and storyteller for GEB Surrogacy Services.
        Write an SEO-optimized, engaging, and professional blog post about: "${topic}".
        
        ${isFictional ? `
        This is a FICTIONAL STORY episode. 
        ${context}
        - Create a compelling plot with suspense about a couple or individual's struggle to have a baby.
        - Ensure the story highlights how GEB Surrogacy Services provided professional guidance, medical coordination, and emotional support.
        - The story must end with a successful birth and happy parents, emphasizing that with God's help and GEB's expertise, dreams come true.
        - Make it emotional, inspirational, and educational.
        - At the end of the post, mention: "Don't miss our next episode, posting tomorrow at 8:00 PM!"
        - If this is the conclusion of a story arc, label it clearly (e.g., "[Final Episode]").
        ` : `
        This is an EDUCATIONAL/TRENDING blog post.
        - Provide high-quality information about surrogacy, IVF, or parenthood.
        - Maintain a professional yet compassionate tone.
        `}

        Requirements:
        1. Return ONLY valid JSON in the exact structure below, no markdown formatting blocks.
        2. "title": A catchy, SEO-friendly title. For fictional stories, use episode-style titles (e.g., "The Journey Begins: Part 1").
        3. "excerpt": A short, 2-sentence summary that builds curiosity.
        4. "content": A comprehensive HTML string containing the full blog post.
           - Use <h2> and <h3> for headings.
           - Use <p>, <ul>, <li>, and <strong>.
           - VERY IMPORTANT: Integrate 1-2 natural internal hyperlinks using <a href="/become-a-surrogate">Become a Surrogate</a> and <a href="/contact">Book a Consultation</a> where relevant in the text.
           - Ensure the end of the post mentions contacting GEB Surrogacy for their own miracle.
           - Make it at least 800 words.
        5. "category": ${isFictional ? '"Fictional Story"' : 'Choose one of: Surrogacy, Parenthood, IVF, Egg Donation, Legal, Health.'}
        6. "image_keywords": 2-3 specific keywords for finding a relevant photo (e.g., "pregnant woman", "baby", "surrogate mother", "happy family").
        
        JSON Structure:
        {
          "title": "",
          "excerpt": "",
          "content": "",
          "category": "",
          "image_keywords": ""
        }
      `;

      let generatedJsonText = "";

      if (provider === "openai") {
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });
        generatedJsonText = response.choices[0]?.message?.content || "";
      } else if (provider === "gemini") {
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
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
        });
        generatedJsonText = response.choices[0]?.message?.content || "";
      }

      // Clean the response (sometimes AI wraps JSON in markdown blocks)
      const cleanedJson = generatedJsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const blogData = JSON.parse(cleanedJson);

      // Generate a relevant image URL using the keywords from AI
      const keywords = blogData.image_keywords || blogData.category || "surrogacy";
      const imageUrl = `https://loremflickr.com/800/600/${encodeURIComponent(keywords.toLowerCase())}`;

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
