const axios = require("axios");

const logger = {
  info: (msg, data = {}) => console.log(`[SOCIAL INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) => console.error(`[SOCIAL ERROR] ${new Date().toISOString()} - ${msg}`, error),
};

class SocialPoster {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate a captivating Facebook caption using the configured AI provider
   */
  async generateCaption(post) {
    try {
      const settings = await this.db.settings.findOne({});
      const provider = settings?.ai_provider || "groq";
      let apiKey = settings?.ai_api_key;

      if (!apiKey) {
        if (provider === "gemini") apiKey = process.env.GEMINI_API_KEY;
        else if (provider === "openai") apiKey = process.env.OPENAI_API_KEY;
        else apiKey = process.env.GROQ_API_KEY;
      }

      if (!apiKey || apiKey === "ADD_YOUR_KEY_HERE") {
        throw new Error(`AI API Key for ${provider} not configured. Cannot generate social caption.`);
      }

      const prompt = `You are a social media expert for GEB Surrogacy Services.
      
COMPANY PROFILE:
We are a surrogacy agency. We provide Surrogacy and IVF Services to intending parents all over the world. Our process involves handling, monitoring, and supervising the entire process. We offer services to intending parents in the #USA, #Canada, #UK, and others.

Write a captivating Facebook post that promotes this new blog article. The post should:
- Be 2-4 sentences that make people WANT to click and read
- Use 2-3 relevant emojis naturally (not excessive)
- Be warm, emotional, and human — never robotic or generic
- Create curiosity or emotional connection
- End with a clear call to action to read the article
- DO NOT include the link (it will be added automatically)
- DO NOT include hashtags (they will be added automatically)

Blog Title: "${post.title}"
Blog Excerpt: "${post.excerpt || ''}"
Blog Category: "${post.category || 'Surrogacy'}"

Return ONLY the caption text, nothing else.`;

      let captionText = "";

      if (provider === "openai") {
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.9,
          max_tokens: 300,
        });
        captionText = response.choices[0]?.message?.content || "";
      } else if (provider === "gemini") {
        const { GoogleGenAI } = require("@google/genai");
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
        });
        captionText = response.text;
      } else {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.9,
          max_tokens: 300,
        });
        captionText = response.choices[0]?.message?.content || "";
      }

      // Clean up the caption
      captionText = captionText.replace(/^["']|["']$/g, "").trim();

      // Add category-specific hashtags
      const hashtagMap = {
        Surrogacy: "#Surrogacy #GEBSurrogacy #SurrogacyJourney #Family",
        Parenthood: "#Parenthood #Family #GEBSurrogacy #ParentingJourney",
        IVF: "#IVF #Fertility #GEBSurrogacy #FertilityJourney",
        "Egg Donation": "#EggDonation #Fertility #GEBSurrogacy #FamilyBuilding",
        Legal: "#SurrogacyLaw #GEBSurrogacy #FertilityRights",
        Health: "#FertilityHealth #GEBSurrogacy #WomenHealth",
        Story: "#SurrogacyStory #GEBSurrogacy #RealStories #Family",
      };

      const hashtags = hashtagMap[post.category] || "#GEBSurrogacy #Surrogacy #Family";

      return `${captionText}\n\n${hashtags}`;
    } catch (error) {
      logger.error("Caption generation failed", error);
      // Fallback caption if AI fails
      return `📖 New on our blog: "${post.title}"\n\nDiscover more on the GEB Surrogacy blog. Click the link to read the full article! 💛\n\n#GEBSurrogacy #Surrogacy #Family`;
    }
  }

  /**
   * Post to Facebook Page using the Graph API
   */
  async postToFacebook(post, caption) {
    const settings = await this.db.settings.findOne({});
    const pageId = settings?.fb_page_id;
    const pageToken = settings?.fb_page_token;

    if (!pageId || !pageToken) {
      throw new Error("Facebook Page ID or Access Token not configured. Go to Settings → Social Media.");
    }

    const postId = post._id || post.id;
    const blogUrl = `https://gebsurrogacyservices.com/blog/${postId}`;
    const fullMessage = `${caption}\n\n👉 Read the full article: ${blogUrl}`;

    const apiUrl = `https://graph.facebook.com/v20.0/${pageId}/feed`;

    const response = await axios.post(apiUrl, {
      message: fullMessage,
      link: blogUrl,
      access_token: pageToken,
    });

    logger.info(`Posted to Facebook successfully. Post ID: ${response.data.id}`);
    return response.data;
  }

  /**
   * Full pipeline: generate caption → post to Facebook → log result
   */
  async publishToSocial(post) {
    const settings = await this.db.settings.findOne({});
    const isEnabled = settings?.social_auto_post === "enabled";

    if (!isEnabled) {
      logger.info("Social auto-posting is disabled. Skipping.");
      return null;
    }

    if (!settings?.fb_page_id || !settings?.fb_page_token) {
      logger.info("Facebook credentials not configured. Skipping social post.");
      return null;
    }

    try {
      logger.info(`Generating social caption for: "${post.title}"`);
      const caption = await this.generateCaption(post);

      logger.info(`Posting to Facebook...`);
      const result = await this.postToFacebook(post, caption);

      // Log success
      await this.db.social_logs.insert({
        post_id: post._id || post.id,
        post_title: post.title,
        platform: "facebook",
        caption: caption,
        fb_post_id: result.id,
        status: "success",
        created_at: new Date(),
      });

      logger.info(`Social post published for: "${post.title}"`);
      return result;
    } catch (error) {
      logger.error(`Social posting failed for: "${post.title}"`, error);

      // Log failure
      await this.db.social_logs.insert({
        post_id: post._id || post.id,
        post_title: post.title,
        platform: "facebook",
        caption: "",
        status: "failed",
        error_message: error.response?.data?.error?.message || error.message,
        created_at: new Date(),
      });

      // Don't throw — social posting failure shouldn't break blog publishing
      return null;
    }
  }

  /**
   * Test the Facebook connection with a simple status check
   */
  async testConnection() {
    const settings = await this.db.settings.findOne({});
    const pageId = settings?.fb_page_id;
    const pageToken = settings?.fb_page_token;

    if (!pageId || !pageToken) {
      throw new Error("Facebook Page ID or Access Token not configured.");
    }

    // Try to fetch Page info to verify token works
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${pageId}?fields=name,fan_count,link&access_token=${pageToken}`
    );

    return {
      success: true,
      page_name: response.data.name,
      followers: response.data.fan_count,
      page_url: response.data.link,
    };
  }
}

module.exports = SocialPoster;
