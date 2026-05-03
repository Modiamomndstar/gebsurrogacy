import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Share2, 
  ArrowLeft, 
  User, 
  Calendar, 
  Tag,
  Clock
} from 'lucide-react'
import SEO from '@/components/SEO'
import AdSenseZone from '@/components/AdSenseZone'

const BlogPost = () => {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [commentName, setCommentName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog-posts/${id}`)
        if (res.ok) {
          const data = await res.json()
          setPost(data)
        }
      } catch (e) {
        console.error('Error fetching post')
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
    window.scrollTo(0, 0)
  }, [id])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentName || !commentText) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/blog-posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: commentName, content: commentText })
      })
      if (res.ok) {
        toast.success('Comment posted successfully!')
        setCommentText('')
        // Reload comments
        const freshPost = await fetch(`/api/blog-posts/${id}`)
        if (freshPost.ok) setPost(await freshPost.json())
      }
    } catch (err) {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#f8a4b9]"></div>
    </div>
  )
  
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-2xl font-bold mb-4 font-serif">Post not found</h1>
      <Link to="/"><Button variant="outline" className="rounded-full">Back to Home</Button></Link>
    </div>
  )

  // Generate processed content and table of contents together for consistency
  const { processedContent, tableOfContents } = (() => {
    const headings: { text: string; id: string }[] = [];
    // @ts-ignore - match is required by replace but not used here
    const processed = post.content.replace(/<(h[23])>(.*?)<\/\1>/g, (match: string, tag: string, text: string) => {
      const cleanText = text.replace(/<[^>]*>/g, '');
      const headingId = cleanText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      headings.push({ text: cleanText, id: headingId });
      return `<${tag} id="${headingId}">${text}</${tag}>`;
    });
    return { processedContent: processed, tableOfContents: headings };
  })();

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfafb]">
      <SEO 
        title={post.title}
        description={post.excerpt}
        ogImage={post.image_url}
        ogType="article"
      />

      {/* Modern High-End Blog Header */}
      <div className="pt-24 pb-12 bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
           <Link to="/blog" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#f8a4b9] mb-8 transition-all group">
             <ArrowLeft className="w-4 h-4" />
             <span className="text-[10px] font-bold uppercase tracking-widest">Back to Insights</span>
           </Link>

           <div className="max-w-3xl">
             <span className="px-4 py-1.5 bg-[#f8a4b9]/10 text-[#f8a4b9] text-[10px] font-bold rounded-full uppercase tracking-widest mb-6 inline-block">
               {post.category}
             </span>
             
             <h1 className="text-4xl md:text-6xl font-serif font-bold text-[#1a1a1a] leading-tight mb-8">
               {post.title}
             </h1>

             <div className="flex flex-wrap items-center gap-6 text-gray-400 text-xs font-medium border-t pt-8">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#f8a4b9]" />
                 </div>
                 <span className="font-bold text-gray-900">{post.author || 'GEB Surrogacy Manager'}</span>
               </div>
               <div className="flex items-center gap-2">
                 <Calendar className="w-4 h-4" />
                 <span>{new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
               </div>
               <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4" />
                 <span>5 min read</span>
               </div>
             </div>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8">
            {/* Featured Image Card */}
            <div className="relative group mb-16">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#f8a4b9] to-[#fbcfe8] rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
              <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-gray-100">
                <img 
                  src={post.image_url} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200';
                  }}
                />
              </div>
            </div>

            <article className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-sm border border-gray-100 relative overflow-hidden">
              <div 
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />

              {/* Interaction Bar */}
              <div className="mt-20 pt-10 border-t flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" className="rounded-full gap-2 text-gray-500 hover:text-[#f8a4b9]" onClick={handleShare}><Share2 className="w-4 h-4" /> Share</Button>
                  <div className="flex gap-2">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" className="w-10 h-10 rounded-full border flex items-center justify-center text-gray-400 hover:text-[#1877f2] hover:bg-blue-50 transition-all"><Facebook className="w-4 h-4" /></a>
                    <a href={`https://instagram.com/geb_surrogacy_services`} target="_blank" className="w-10 h-10 rounded-full border flex items-center justify-center text-gray-400 hover:text-[#e4405f] hover:bg-pink-50 transition-all"><Instagram className="w-4 h-4" /></a>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <Tag className="w-3 h-3 text-[#f8a4b9]" /> {post.category}
                </div>
              </div>
            </article>

            {/* Comments Section */}
            <div className="mt-16 bg-white rounded-[2.5rem] p-8 md:p-16 border border-gray-100">
               <h3 className="text-2xl font-serif font-bold mb-12 text-[#1a1a1a]">Community Voices</h3>
               <form onSubmit={handleCommentSubmit} className="space-y-6 mb-16">
                 <Input 
                   placeholder="Your Name" 
                   value={commentName} 
                   onChange={(e) => setCommentName(e.target.value)}
                   className="rounded-2xl h-14 bg-gray-50 border-none focus:ring-2 focus:ring-[#f8a4b9]/20"
                 />
                 <Textarea 
                   placeholder="Share your thoughts..." 
                   value={commentText}
                   onChange={(e) => setCommentText(e.target.value)}
                   className="rounded-[2rem] min-h-[150px] bg-gray-50 border-none focus:ring-2 focus:ring-[#f8a4b9]/20 p-6"
                 />
                 <Button type="submit" disabled={submitting} className="bg-[#f8a4b9] text-white px-10 h-14 rounded-2xl font-bold">
                   {submitting ? 'Posting...' : 'Post Comment'}
                 </Button>
               </form>

               <div className="space-y-8">
                 {post.comments?.map((comment: any) => (
                   <div key={comment._id} className="flex gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#f8a4b9] flex items-center justify-center font-bold">{comment.name[0]}</div>
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-bold text-gray-900">{comment.name}</span>
                         <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                       </div>
                       <p className="text-gray-600">{comment.content}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-12">
            {/* CTA Mirrored from Screenshot */}
            <div className="bg-[#2d2d2d] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#f8a4b9]/10 rounded-full blur-3xl" />
               <h3 className="text-2xl font-serif font-bold mb-4">Start Your Miracle Today</h3>
               <p className="text-gray-400 text-sm leading-relaxed mb-8">We guide you through every step of your parenthood journey with expertise and compassion.</p>
               <Link to="/#consultation">
                 <Button className="w-full bg-[#f8a4b9] hover:bg-white hover:text-[#f8a4b9] h-14 rounded-2xl font-bold text-lg transition-all">
                   Book Free Consultation
                 </Button>
               </Link>
            </div>

            {/* Social Connect */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100">
               <h4 className="font-serif font-bold mb-6">Connect With Us</h4>
               <div className="grid grid-cols-2 gap-4">
                 <a href="https://facebook.com/share/192smxW7GG/" target="_blank" className="p-6 bg-gray-50 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-50 transition-colors">
                   <Facebook className="text-[#1877f2] w-6 h-6" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Facebook</span>
                 </a>
                 <a href="https://instagram.com/geb_surrogacy_services" target="_blank" className="p-6 bg-gray-50 rounded-2xl flex flex-col items-center gap-2 hover:bg-pink-50 transition-colors">
                   <Instagram className="text-[#e4405f] w-6 h-6" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Instagram</span>
                 </a>
               </div>
            </div>

            {/* Table of Contents - Dynamically Generated */}
            {tableOfContents.length > 0 && (
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100">
                <h4 className="font-serif font-bold mb-6">Table of Contents</h4>
                <nav className="space-y-4">
                  {tableOfContents.map((item: { text: string, id: string }, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => scrollToId(item.id)}
                      className="flex w-full text-left gap-4 group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-gray-300 group-hover:text-[#f8a4b9]">{idx + 1}.</span>
                      <span className="text-sm text-gray-500 group-hover:text-gray-900 transition-colors">{item.text}</span>
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Guidance Block */}
            <div className="bg-[#fdfafb] rounded-[2.5rem] p-8 border border-[#f8a4b9]/10 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f8a4b9]/10 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-6 h-6 text-[#f8a4b9]" />
              </div>
              <h4 className="font-serif font-bold mb-2">Need Personalized Guidance?</h4>
              <p className="text-gray-500 text-xs leading-relaxed mb-6">Our experienced team is here to answer your questions and guide you through every step.</p>
              <Button variant="outline" className="w-full border-[#f8a4b9] text-[#f8a4b9] hover:bg-[#f8a4b9] hover:text-white rounded-2xl font-bold h-12">
                Get Expert Help
              </Button>
            </div>

            <div className="sticky top-24">
              <AdSenseZone slot="blog_sidebar_sticky" format="auto" className="rounded-3xl overflow-hidden shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlogPost;
