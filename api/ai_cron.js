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
        - Generate CLEAN SEMANTIC HTML only. 
        - Use diverse structures: <h2> and <h3> for sections, <p> for body, <ul>/<li> for key points, and <blockquote> for testimonials or impact statements.
        - DO NOT include inline styles, custom classes, or <div> wrappers.
        - Integrate 1-2 natural internal links using <a href="/become-a-surrogate">Become a Surrogate</a> or <a href="/contact">Book a Consultation</a>.
        - Use <p class="highlight">...</p> once for a high-impact call-to-action within the content.
        - Length: At least 1200 words of rich, helpful content.

        Return ONLY valid JSON:
        {
          "title": "A unique, non-generic title",
          "excerpt": "A high-conversion meta description (2 sentences)",
          "content": "Full semantic HTML string",
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

      // Better Image Logic: Use stable, high-quality Unsplash IDs for reliability
      const imageMap = {
        'Surrogacy': 'photo-1519494026892-80bbd2d6fd0d',
        'Parenthood': 'photo-1555252333-9f8e92e65df9',
        'IVF': 'photo-1581056771107-24ca5f033842',
        'Egg Donation': 'photo-1579154235884-332cfa090ff7',
        'Legal': 'photo-1589829545856-d10d557cf95f',
        'Health': 'photo-1505751172107-59c359f63677',
        'Fictional Story': 'photo-1532012197267-da84d127e765'
      };

      const category = blogData.category || (isFictional ? "Fictional Story" : "Surrogacy");
      const photoId = imageMap[category] || 'photo-1519494026892-80bbd2d6fd0d';
      const imageUrl = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=1200`;

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
