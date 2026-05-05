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
    this.activeJobs = [];
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

      // Fetch recent posts to avoid duplicates (increased to 30 for strict uniqueness)
      const recentPosts = await this.db.blog_posts.find({}).sort({ created_at: -1 }).limit(30);
      const recentTitles = recentPosts.map(p => `"${p.title}"`).join(", ");

      const isFictional = forceCategory === "Story";
      
      const prompt = `
        You are a world-class SEO content strategist, medical writer, and creative storyteller for GEB Surrogacy Services.
        Your goal is to write a highly valuable, 100% unique blog post that feels human, emotionally resonant, and deeply informative.
        It is critical that this post meets Google AdSense quality guidelines for original, substantive, and high-value content.
        
        COMPANY PROFILE:
        We are a surrogacy agency. We provide Surrogacy and IVF Services to intending parents all over the world. Our process involves handling, monitoring, and supervising the entire process. We offer services to intending parents in the #USA, #Canada, #UK, and others.
        (Please incorporate this identity naturally into the content where appropriate without sounding repetitive).
        
        Topic Focus: "${topic}"
        Category: ${forceCategory || "Choose the most appropriate from: Surrogacy, Parenthood, IVF, Egg Donation, Legal, Health, Story, News"}

        ${context ? `Additional Context: ${context}\n` : ""}
        CRITICAL UNIQUENESS RULES:
        - DO NOT generate a post similar to any of these recently published titles: [${recentTitles}]
        - NEVER start the post with generic phrases like "For individuals and couples seeking..." or "Embarking on the journey of...".
        - The introduction must be a completely unique hook: start with a startling statistic, a profound question, a specific real-world scenario, or a bold statement.
        
        SEO & ADSENSE GUIDELINES:
        - The content MUST be strictly compliant with Google's Helpful Content Update (E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness).
        - Must be medically accurate but phrased as educational information, not professional medical advice.
        - DO NOT include explicit or policy-violating content.
        - Ensure clear, communicative, captivating, and unambiguous English.
        - Include an "FAQ" section at the end with 3-4 specific questions and answers related to the topic.
        - Use rich formatting: bullet points, numbered lists, and short, readable paragraphs.
        
        TITLE OPTIMIZATION:
        - The title MUST be 100% perfect for SEO and highly captivating to gain visitors' attention immediately.
        - It must be clear, unambiguous, and compelling (e.g., use power words, numbers, or emotional triggers appropriately).
        
        Structure Guidelines:
        - Generate CLEAN SEMANTIC HTML only. 
        - Use diverse structures: <h2> and <h3> for sections, <p> for body, <ul>/<li> for key points, and <blockquote> for testimonials or impact statements.
        - DO NOT include inline styles, custom classes, or <div> wrappers.
        - Integrate 2-3 natural internal links using <a href="/become-a-surrogate">Become a Surrogate</a>, <a href="/contact">Book a Consultation</a>, or <a href="/">GEB Surrogacy</a>.
        - Use <p class="highlight">...</p> once for a high-impact call-to-action within the content.
        - Length: Minimum 2000 words. The content MUST be in-depth, comprehensive, and highly detailed to satisfy SEO depth requirements.

        Return ONLY valid JSON:
        {
          "title": "A highly captivating, SEO-optimized title without ambiguity",
          "excerpt": "A high-conversion meta description (2 sentences) that commands attention",
          "content": "Full semantic HTML string (at least 2000 words)",
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
          max_tokens: 4000
        });
        generatedJsonText = response.choices[0]?.message?.content || "";
      } else if (provider === "gemini") {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-pro",
          contents: prompt,
          config: {
            maxOutputTokens: 8192,
            temperature: 0.8
          }
        });
        generatedJsonText = response.text;
      } else {
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.8,
          max_tokens: 4000
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
          cleaned = cleaned.replace(/"([^"]*)"/g, (match, group) => {
            return `"${group.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;
          });

          return JSON.parse(cleaned);
        } catch (e) {
          logger.error("JSON Cleanup/Parse Failed", { original: text, error: e.message });
          try {
             const match = text.match(/\{[\s\S]*\}/);
             if (match) return JSON.parse(match[0].replace(/\n/g, "\\n"));
          } catch (inner) {}
          throw new Error(`AI returned invalid JSON: ${e.message}`);
        }
      };

      const blogData = cleanAIResponse(generatedJsonText);

      const category = blogData.category === "Fictional Story" || blogData.category === "Story" ? "Story" : (blogData.category || (isFictional ? "Story" : "Surrogacy"));
      
      const imagePool = {
        'Surrogacy': ['photo-1519494026892-80bbd2d6fd0d', 'photo-1581056771107-24ca5f033842', 'photo-1555252333-9f8e92e65df9', 'photo-1502680390469-be75c86b636f', 'photo-1516627145497-ae6968895b74'],
        'Parenthood': ['photo-1516627145497-ae6968895b74', 'photo-1433360405326-e50f909805b3', 'photo-1544126592-807ade215a0b', 'photo-1511895426328-dc8714191300', 'photo-1491438590914-bc09fcaaf77a'],
        'IVF': ['photo-1581056771107-24ca5f033842', 'photo-1530497610245-94d3c16cda28', 'photo-1579154235884-332cfa090ff7', 'photo-1582719478250-c89cae4dc85b', 'photo-1576091160550-2173dba999ef'],
        'Egg Donation': ['photo-1579154235884-332cfa090ff7', 'photo-1581056771107-24ca5f033842', 'photo-1582719478250-c89cae4dc85b', 'photo-1530497610245-94d3c16cda28'],
        'Legal': ['photo-1589829545856-d10d557cf95f', 'photo-1450101499163-c8848c66cb85', 'photo-1505664177941-c66c68a41280', 'photo-1521791136064-7986c2920216', 'photo-1475506631979-72412c606f4d'],
        'Health': ['photo-1505751172107-59c359f63677', 'photo-1579684385127-1ef15d508118', 'photo-1532938911079-1b06ac7ce245', 'photo-1505576391880-b3f9d713dc4f', 'photo-1584036561566-baf8f5f1b144'],
        'Story': ['photo-1536640712247-c5753b75fb71', 'photo-1504151932400-72d4384f0e6d', 'photo-1511895426328-dc8714191300', 'photo-1544126592-807ade215a0b', 'photo-1490645935967-10de6ba17061'],
        'News': ['photo-1504711434969-e33886168f5c', 'photo-1495020689067-958852a7765e', 'photo-1585829365295-ab7cd400c167', 'photo-1526470608268-f674ce90ebd4']
      };
      
      const categoryPool = imagePool[category] || imagePool['Surrogacy'];
      const randomPhotoId = categoryPool[Math.floor(Math.random() * categoryPool.length)];
      const imageUrl = `https://images.unsplash.com/${randomPhotoId}?auto=format&fit=crop&q=80&w=1200`;

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
    
    if (this.activeJobs && this.activeJobs.length > 0) {
      this.activeJobs.forEach(job => job.stop());
      this.activeJobs = [];
    }

    if (isEnabled) {
      logger.info("AI Auto-posting is ENABLED. Scheduling 4 daily jobs (6 AM, 12 PM, 6 PM, 10 PM)...");
      
      // 6:00 AM - Health/IVF/Egg Donation
      const morningJob = cron.schedule("0 6 * * *", async () => {
        logger.info("6AM Cron: Generating Health/IVF post");
        const topicsArray = [
          "IVF tips for success and health", "Understanding the egg donation process",
          "Surrogate health, nutrition and advice", "General reproductive health and wellness",
          "Preparing your body for IVF treatment", "Emotional well-being during fertility treatments"
        ];
        const randomTopic = topicsArray[Math.floor(Math.random() * topicsArray.length)];
        const category = ["Health", "IVF", "Egg Donation"][Math.floor(Math.random() * 3)];
        try { await this.generatePost(randomTopic, category); } catch (err) { logger.error("6AM cron failed", err); }
      });
      
      // 12:00 PM - News/Surrogacy Trends
      const noonJob = cron.schedule("0 12 * * *", async () => {
        logger.info("12PM Cron: Generating News/Surrogacy Trends post");
        const currentSettings = await this.db.settings.findOne({});
        let topicsArray = [
          "Latest news and trends in fertility treatments", "Surrogacy benefits for intended parents",
          "International surrogacy laws and regulations updates", "The surrogacy journey explained",
          "How surrogacy is changing modern families", "Recent advancements in IVF technology"
        ];
        if (currentSettings?.ai_topics) {
          topicsArray = currentSettings.ai_topics.split(",").map(t => t.trim());
        }
        const randomTopic = topicsArray[Math.floor(Math.random() * topicsArray.length)] || "Surrogacy benefits";
        const category = ["News", "Surrogacy"][Math.floor(Math.random() * 2)];
        try { await this.generatePost(randomTopic, category); } catch (err) { logger.error("12PM cron failed", err); }
      });

      // 6:00 PM - Legal/Parenthood
      const eveningJob = cron.schedule("0 18 * * *", async () => {
        logger.info("6PM Cron: Generating Legal/Parenthood post");
        const topicsArray = [
          "Crucial advice for intended parents", "Legal rights and contracts in surrogacy",
          "Navigating the legal aspects of international surrogacy", "Preparing your home for a new baby",
          "The emotional journey of parenthood via surrogacy", "Understanding surrogacy agreements and escrow"
        ];
        const randomTopic = topicsArray[Math.floor(Math.random() * topicsArray.length)];
        const category = ["Legal", "Parenthood"][Math.floor(Math.random() * 2)];
        try { await this.generatePost(randomTopic, category); } catch (err) { logger.error("6PM cron failed", err); }
      });

      // 10:00 PM - Fictional Story Episode
      const nightJob = cron.schedule("0 22 * * *", async () => {
        logger.info("10PM Cron: Generating Daily Story Episode");
        
        // Find the most recent story to provide context for episodes
        const lastStory = await this.db.blog_posts.findOne({ category: "Story" }, { sort: { created_at: -1 } });
        
        const stories = [
          "A Miracle in Lagos: Sarah's Journey", "Finding Hope: The Olayinka Story",
          "Cross-border Love: From London to Lagos", "The Gift of Life: A Surrogate's Sacrifice",
          "Modern Family: How IVF Changed Everything", "The Waiting Room: A Father's Perspective",
          "A Mother's Resilience: Overcoming Infertility"
        ];
        const randomTopic = stories[Math.floor(Math.random() * stories.length)];
        
        let context = "Write a beautiful, emotional, and captivating fictional narrative or deeply reflective true-to-life story based on the topic.";
        if (lastStory) {
          context += `\nThe previous story published was titled "${lastStory.title}". If this is a continuation, feel free to link back to it using <a href="/blog/${lastStory._id}">Read the previous story</a>, or otherwise start a fresh, unique tale.`;
        }

        try { await this.generatePost(randomTopic, "Story", context); } catch (err) { logger.error("10PM cron failed", err); }
      });

      this.activeJobs.push(morningJob, noonJob, eveningJob, nightJob);

    } else {
      logger.info("AI Auto-posting is DISABLED.");
    }
  }
}

module.exports = AIEngine;
