import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Mail, 
  Phone, 
  MapPin, 
  ArrowLeft, 
  Clock,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Send,
  ShieldCheck,
  Headphones
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import SEO from '@/components/SEO'

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [siteSettings, setSiteSettings] = useState<any>({})

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSiteSettings(data))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          first_name: (data.fullName as string).split(' ')[0],
          last_name: (data.fullName as string).split(' ').slice(1).join(' ') || 'User',
          preferred_date: new Date().toISOString()
        })
      })
      if (res.ok) {
        toast.success('Message sent successfully! We will get back to you soon.')
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error('Failed to send message. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const offices = [
    {
      city: 'Nigeria Office',
      address: siteSettings.address_nigeria || 'Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria',
      phone: siteSettings.contact_phone || '+2347034270722',
      email: siteSettings.contact_email || 'gebheritagagency@gmail.com'
    },
    {
      city: 'UK Presence',
      address: siteSettings.address_uk || 'Leeds, UK',
      phone: siteSettings.uk_phone || '+447933193271',
      email: 'uk@gebsurrogacyservices.com'
    },
    {
      city: 'USA Presence',
      address: siteSettings.address_usa || 'California, USA',
      phone: siteSettings.usa_phone || '+13102188513',
      email: 'usa@gebsurrogacyservices.com'
    }
  ]

  return (
    <div className="min-h-screen bg-[#fdfafb]">
      <SEO 
        title="Contact Us | GEB Surrogacy Services"
        description="Get in touch with our compassionate team. We are here to guide you through your surrogacy journey in Nigeria, UK, and USA."
      />

      {/* Hero Header */}
      <div className="bg-white border-b border-[#f0e7ec] pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#f8a4b9] mb-8 transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Back to Home</span>
          </Link>
          
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-[#1a1a1a] leading-tight mb-6">
              Let's Start Your <span className="text-[#f8a4b9]">Journey</span> Together
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed">
              Have questions about surrogacy, egg donation, or our process? Our expert team is ready to provide the guidance and support you need.
            </p>
          </div>
        </div>
      </div>

      <main className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-16">
            
            {/* Contact Info Side */}
            <div className="lg:col-span-5 space-y-12">
              <section className="space-y-8">
                <h3 className="text-2xl font-serif font-bold text-[#1a1a1a]">Our Global Presence</h3>
                <div className="space-y-6">
                  {offices.map((office, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-[#f0e7ec] shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MapPin className="w-6 h-6 text-[#f8a4b9]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 mb-2">{office.city}</h4>
                          <p className="text-gray-500 text-sm leading-relaxed mb-4">{office.address}</p>
                          <div className="space-y-2">
                            <a href={`tel:${office.phone}`} className="flex items-center gap-2 text-xs font-bold text-[#f8a4b9] hover:underline">
                              <Phone className="w-3 h-3" /> {office.phone}
                            </a>
                            <a href={`mailto:${office.email}`} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                              <Mail className="w-3 h-3" /> {office.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#2d2d2d] text-white p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#f8a4b9]/10 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-[#f8a4b9]" />
                  </div>
                  <h4 className="text-xl font-bold">Response Time</h4>
                  <p className="text-gray-400 leading-relaxed">
                    Our team typically responds to all inquiries within 24 business hours. For urgent matters, please use our WhatsApp support.
                  </p>
                  <a href="https://wa.me/2347034270722" target="_blank" className="inline-flex items-center gap-2 text-[#f8a4b9] font-bold hover:gap-3 transition-all">
                    Chat on WhatsApp <ArrowLeft className="w-4 h-4 rotate-180" />
                  </a>
                </div>
              </section>
            </div>

            {/* Contact Form Side */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border border-[#f0e7ec]">
                <div className="mb-12">
                  <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-4">Send us a Message</h2>
                  <p className="text-gray-500">Tell us about your needs and we'll connect you with the right expert.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Full Name</label>
                      <Input name="fullName" placeholder="John Doe" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <Input name="email" type="email" placeholder="john@example.com" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <Input name="phone" type="tel" placeholder="+234..." required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Inquiry Type</label>
                      <select name="inquiryType" className="w-full bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20 text-sm font-medium outline-none appearance-none">
                        <option value="intended-parent">Intended Parent Inquiry</option>
                        <option value="surrogate-interest">Interested in Becoming a Surrogate</option>
                        <option value="egg-donation">Egg Donation Inquiry</option>
                        <option value="other">Other General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
                    <Textarea 
                      name="message" 
                      placeholder="How can we help you today?" 
                      className="bg-gray-50 border-none rounded-[2rem] min-h-[180px] p-8 focus:ring-2 focus:ring-[#f8a4b9]/20"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-[#f8a4b9] hover:bg-[#e88aa3] text-white py-8 rounded-2xl font-bold text-lg shadow-lg shadow-[#f8a4b9]/20 transition-all hover:scale-[1.01]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Send Message
                      </div>
                    )}
                  </Button>

                  <div className="grid grid-cols-2 gap-4 pt-8 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secure & Confidential</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Headphones className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">24/7 Expert Support</span>
                    </div>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Social Bar */}
      <section className="bg-white border-y border-[#f0e7ec] py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
            <a href="#" className="flex items-center gap-2 font-bold text-gray-900"><Instagram className="w-6 h-6" /> Instagram</a>
            <a href="#" className="flex items-center gap-2 font-bold text-gray-900"><Facebook className="w-6 h-6" /> Facebook</a>
            <a href="#" className="flex items-center gap-2 font-bold text-gray-900"><Twitter className="w-6 h-6" /> Twitter</a>
            <a href="#" className="flex items-center gap-2 font-bold text-gray-900"><Linkedin className="w-6 h-6" /> LinkedIn</a>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-gray-400 text-xs">
        <p>&copy; {new Date().getFullYear()} GEB Surrogacy Services. All rights reserved.</p>
      </footer>
    </div>
  )
}
