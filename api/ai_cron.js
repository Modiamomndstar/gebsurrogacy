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

      // Fetch recent posts to avoid duplicates
      const recentPosts = await this.db.blog_posts.find({}).sort({ created_at: -1 }).limit(10);
      const recentTitles = recentPosts.map(p => `"${p.title}"`).join(", ");

      const isFictional = forceCategory === "Story";
      
      const prompt = `
        You are a world-class SEO content strategist, medical writer, and creative storyteller for GEB Surrogacy Services.
        Your goal is to write a highly valuable, 100% unique blog post that feels human, emotionally resonant, and deeply informative.
        It is critical that this post meets Google AdSense quality guidelines for original, substantive content.
        
        Topic Focus: "${topic}"
        Category: ${forceCategory || "Choose the most appropriate from: Surrogacy, Parenthood, IVF, Egg Donation, Legal, Health, Story, News"}

        ${context ? `Additional Context: ${context}\n` : ""}
        CRITICAL UNIQUENESS RULES:
        - DO NOT generate a post similar to any of these recently published titles: [${recentTitles}]
        - NEVER start the post with generic phrases like "For individuals and couples seeking..." or "Embarking on the journey of...".
        - The introduction must be a completely unique hook: start with a startling statistic, a profound question, a specific real-world scenario, or a bold statement.
        
        Tone & Content Guidelines:
        - Include actionable advice, real-world nuances, and specific details (e.g., international laws, specific health tips).
        - For EDUCATIONAL posts: Be authoritative, compassionate, and highly informative. Provide deep value, not just surface-level overviews.
        - For FICTIONAL stories: Use vivid imagery, character depth, and focused storytelling.
        - Ensure the content is structured logically with a high-value takeaway in every section.
        
        Structure Guidelines:
        - Generate CLEAN SEMANTIC HTML only. 
        - Use diverse structures: <h2> and <h3> for sections, <p> for body, <ul>/<li> for key points, and <blockquote> for testimonials or impact statements.
        - DO NOT include inline styles, custom classes, or <div> wrappers.
        - Integrate 1-2 natural internal links using <a href="/become-a-surrogate">Become a Surrogate</a> or <a href="/contact">Book a Consultation</a>.
        - Use <p class="highlight">...</p> once for a high-impact call-to-action within the content.
        - Length: At least 1200 words of rich, helpful content.

        Return ONLY valid JSON:
        {
          "title": "A unique, non-generic, highly captivating title",
          "excerpt": "A high-conversion meta description (2 sentences)",
          "content": "Full semantic HTML string",
          "category": "One of: Surrogacy, Parenthood, IVF, Egg Donation, Legal, Health, Story, News",
          "image_keywords": "3-4 specific visual keywords for a premium photo (e.g., 'doctor,consultation,hospital' or 'happy,family,baby')"
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

      // --- Robust JSON Extraction & Cleanup ---
      const cleanAIResponse = (text) => {
        try {
          // 1. Remove markdown blocks
          let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          
          // 2. Find the first '{' and last '}' to extract the JSON object
          const startIdx = cleaned.indexOf('{');
          const endIdx = cleaned.lastIndexOf('}');
          if (startIdx === -1 || endIdx === -1) throw new Error("No JSON object found in AI response");
          cleaned = cleaned.substring(startIdx, endIdx + 1);

          // 3. Handle 'Bad control character' by removing literal newlines/tabs inside strings
          // This regex finds content inside quotes and replaces literal newlines with \n
          cleaned = cleaned.replace(/"([^"]*)"/g, (match, group) => {
            return `"${group.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;
          });

          return JSON.parse(cleaned);
        } catch (e) {
          logger.error("JSON Cleanup/Parse Failed", { original: text, error: e.message });
          // If parsing fails, try one last desperate attempt with a simpler regex
          try {
             const match = text.match(/\{[\s\S]*\}/);
             if (match) return JSON.parse(match[0].replace(/\n/g, "\\n"));
          } catch (inner) {}
          throw new Error(`AI returned invalid JSON: ${e.message}`);
        }
      };

      const blogData = cleanAIResponse(generatedJsonText);

      const category = blogData.category === "Fictional Story" || blogData.category === "Story" ? "Story" : (blogData.category || (isFictional ? "Story" : "Surrogacy"));
      
      // Dynamic Unique Image Logic based on AI keywords
      // Use loremflickr with a random cache-buster to guarantee uniqueness for every post
      const rawKeywords = blogData.image_keywords || category || "surrogacy,family";
      const cleanKeywords = rawKeywords.replace(/[^a-zA-Z0-9\s,]/g, '').replace(/\s+/g, ',').replace(/,+/g, ',');
      const imageUrl = `https://loremflickr.com/1200/800/${encodeURIComponent(cleanKeywords)}?random=${Date.now()}`;

      const newPost = {
        title: blogData.title,
        excerpt: blogData.excerpt,
        content: blogData.content,
        category: category,
        author: "GEB Surrogacy Manager",
        image_url: imageUrl,
        status: "published",
        published_at: new Date(),
        created_at: new Date(),
      };

      await this.db.blog_posts.insert(newPost);

      // Trigger social media posting (non-blocking)
      try {
        const SocialPoster = require("./social_poster");
        const socialPoster = new SocialPoster(this.db);
        await socialPoster.publishToSocial(newPost);
      } catch (socialErr) {
        logger.error("Social posting after AI generation failed (non-critical)", socialErr);
      }
      
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
      logger.info("AI Auto-posting is ENABLED. Scheduling twice daily jobs (8 AM Trends, 8 PM Daily Story Episode)...");
      
      // 8:00 AM - Educational/Trending Blog Post
      cron.schedule("0 8 * * *", async () => {
        logger.info("Morning Cron: Generating Trends/Educational post");
        const currentSettings = await this.db.settings.findOne({});
        // Default expanded topic list if none configured
        let topicsArray = [
          "Surrogacy benefits", "The surrogacy journey", "IVF tips for success", 
          "International surrogacy laws and regulations", "Understanding sperm donation",
          "Surrogate health, nutrition and advice", "Crucial advice for intended parents",
          "Sexual education and fertility", "General reproductive health and wellness",
          "What surrogate mothers need to know", "Legal rights and contracts in surrogacy",
          "Latest news and trends in fertility treatments", "Emotional well-being during IVF"
        ];
        
        if (currentSettings?.ai_topics) {
          topicsArray = currentSettings.ai_topics.split(",").map(t => t.trim());
        }
        
        const randomTopic = topicsArray[Math.floor(Math.random() * topicsArray.length)] || "Surrogacy benefits";
        try { await this.generatePost(randomTopic); } catch (err) { logger.error("Morning cron failed", err); }
      });

      // 8:00 PM - Fictional Story Episode
      cron.schedule("0 20 * * *", async () => {
        logger.info("Evening Cron: Generating Daily Story Episode");
        
        // Find the most recent story to provide context for episodes
        const lastStory = await this.db.blog_posts.findOne({ category: "Story" }, { sort: { created_at: -1 } });
        
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
          await this.generatePost(randomTopic, "Story", context); 
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
