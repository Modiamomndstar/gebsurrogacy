import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Heart, 
  Baby, 
  CheckCircle, 
  ArrowLeft, 
  Send,
  User,
  Phone,
  MapPin,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import SEO from '@/components/SEO'

export default function BecomeASurrogate() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const res = await fetch('/api/surrogate-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        toast.success('Your application has been submitted successfully! We will contact you soon.')
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error('Failed to submit application. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfafb]">
      <SEO 
        title="Become a Surrogate | Help Create a Family"
        description="Join our compassionate surrogacy program. Help intended parents fulfill their dreams while receiving exceptional care and support."
      />

      {/* Header */}
      <header className="py-8 bg-white border-b border-[#f0e7ec] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group text-[#2d2d2d] hover:text-[#f8a4b9] transition-colors">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">Back to Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f8a4b9] rounded-xl flex items-center justify-center">
              <Baby className="w-6 h-6 text-white" />
            </div>
            <span className="font-serif text-xl font-bold">GEB Surrogacy</span>
          </div>
        </div>
      </header>

      <main className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            
            {/* Information Column */}
            <div className="space-y-8">
              <div className="scroll-reveal">
                <span className="px-4 py-1.5 bg-[#ffeef2] text-[#e88aa3] text-xs font-bold rounded-full uppercase tracking-wider mb-6 inline-block">
                  Join Our Program
                </span>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#2d2d2d] mb-6 leading-tight">
                  Give the Gift of <span className="text-[#f8a4b9]">Parenthood</span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Becoming a surrogate is one of the most selfless and rewarding journeys a woman can take. 
                  At GEB Surrogacy, we ensure you are supported every step of the way with professional care, 
                  legal protection, and competitive compensation.
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#2d2d2d]">Basic Requirements</h3>
                <div className="grid gap-4">
                  {[
                    "Age between 21 and 40 years old",
                    "Have had at least one successful pregnancy",
                    "Living in a stable environment",
                    "Non-smoker and drug-free",
                    "Physical and mental health screening"
                  ].map((req, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-[#f0e7ec] shadow-sm">
                      <CheckCircle className="w-5 h-5 text-[#f8a4b9] shrink-0 mt-0.5" />
                      <span className="text-gray-700 font-medium">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#2d2d2d] text-white p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Heart className="w-24 h-24" />
                </div>
                <h4 className="text-xl font-bold mb-4 relative z-10">Why Choose Us?</h4>
                <p className="text-gray-400 text-sm mb-6 relative z-10">
                  We treat our surrogates like family. You'll have a dedicated coordinator available 24/7 to answer your questions and provide emotional support.
                </p>
                <Link to="/contact" className="text-[#f8a4b9] font-bold flex items-center gap-2 hover:gap-3 transition-all relative z-10">
                  Learn about compensation <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            </div>

            {/* Form Column */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-[#f0e7ec] relative">
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-8">Application Form</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-4 h-4" /> Personal Information
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 ml-1">Full Name</label>
                      <Input name="fullName" placeholder="Jane Doe" required className="bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 ml-1">Date of Birth</label>
                      <Input name="dob" type="date" required className="bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Contact Details
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 ml-1">Email Address</label>
                      <Input name="email" type="email" placeholder="jane@example.com" required className="bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 ml-1">Phone Number</label>
                      <Input name="phone" type="tel" placeholder="+234..." required className="bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Current Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input name="location" placeholder="City, Country" required className="pl-11 bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4" /> Health & History
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 ml-1">Number of Previous Births</label>
                      <Input name="previousBirths" type="number" min="1" required className="bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 ml-1">Last Delivery Date</label>
                      <Input name="lastDelivery" type="date" required className="bg-[#fcfafb] border-gray-100 rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Brief Health Summary</label>
                    <Textarea 
                      name="healthSummary" 
                      placeholder="Please share any important medical details..." 
                      className="bg-[#fcfafb] border-gray-100 rounded-2xl min-h-[100px]"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#f8a4b9] hover:bg-[#e88aa3] text-white py-8 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-[#f8a4b9]/20"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Submit Application
                    </div>
                  )}
                </Button>

                <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                  Your information is strictly confidential and protected.
                </p>
              </form>
            </div>

          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-12 bg-white border-t border-[#f0e7ec]">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} GEB Surrogacy Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
