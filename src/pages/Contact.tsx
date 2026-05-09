import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Mail, 
  Phone, 
  MapPin, 
  ArrowLeft, 
  Clock,
  Instagram,
  Facebook,
  MessageCircle,
  Stethoscope,
  HelpCircle,
  ChevronRight,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import SEO from '@/components/SEO'

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [siteSettings, setSiteSettings] = useState<any>({})
  const location = useLocation()

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSiteSettings(data.settings || {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  }, [location])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    // Check if it's a consultation or general message
    const isConsultation = (e.currentTarget.getAttribute('id') === 'consultation-form')

    try {
      const endpoint = isConsultation ? '/api/consultations' : '/api/contact'
      const payload = isConsultation ? {
        ...data,
        first_name: data.firstName,
        last_name: data.lastName,
        preferred_date: data.preferredDate || new Date().toISOString()
      } : {
        name: data.fullName,
        email: data.email,
        subject: data.inquiryType || 'General Inquiry',
        message: data.message
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        toast.success(isConsultation ? 'Consultation request received! We will contact you for scheduling.' : 'Message sent successfully! We will get back to you soon.')
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error('Failed to send. Please try again.')
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
      address: siteSettings.nigeria_address || 'Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria',
      phone: siteSettings.nigeria_phone || '+2347034270722',
      email: siteSettings.nigeria_email || 'gebsurrogacyservices@gmail.com'
    },
    {
      city: 'UK Presence',
      address: siteSettings.uk_address || 'Leeds, UK',
      phone: siteSettings.uk_phone || '+447933193271',
      email: siteSettings.uk_email || 'gebsurrogacyservices@gmail.com'
    },
    {
      city: 'USA Presence',
      address: siteSettings.usa_address || 'California, USA',
      phone: siteSettings.usa_phone || '+13102188513',
      email: siteSettings.usa_email || 'gebsurrogacyservices@gmail.com'
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
              Connect With <span className="text-[#f8a4b9]">Our Team</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              Whether you have a general question or you're ready for a deep dive into your surrogacy options, we're here to help.
            </p>
            <div className="flex flex-wrap gap-4">
               <a href="#consultation" className="px-8 py-4 bg-[#f8a4b9] text-white rounded-2xl font-bold shadow-lg shadow-[#f8a4b9]/20 hover:scale-105 transition-all">Book a Consultation</a>
               <a href="#message" className="px-8 py-4 bg-white border border-[#f0e7ec] text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all">General Inquiry</a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Contact Options */}
      <div className="py-12 bg-white/50 border-b border-[#f0e7ec]">
        <div className="container mx-auto px-4 max-w-6xl">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <a href={`mailto:${siteSettings.contact_email || 'gebsurrogacyservices@gmail.com'}`} className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-[#f0e7ec] hover:border-[#f8a4b9] transition-all group">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Mail className="w-6 h-6 text-blue-500" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Us</p>
                    <p className="font-bold text-gray-900 truncate">{siteSettings.contact_email || 'gebsurrogacyservices@gmail.com'}</p>
                 </div>
              </a>
              <a href={`https://wa.me/${siteSettings.whatsapp_number || '2347034270722'}`} target="_blank" className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-[#f0e7ec] hover:border-[#25d366] transition-all group">
                 <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                    <MessageCircle className="w-6 h-6 text-[#25d366]" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WhatsApp Support</p>
                    <p className="font-bold text-gray-900">Chat with an Expert</p>
                 </div>
              </a>
              <a href={`tel:${siteSettings.contact_phone || '+2347034270722'}`} className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-[#f0e7ec] hover:border-pink-400 transition-all group">
                 <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                    <Phone className="w-6 h-6 text-[#f8a4b9]" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Call Directly</p>
                    <p className="font-bold text-gray-900">{siteSettings.contact_phone || '+234 703 427 0722'}</p>
                 </div>
              </a>
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

            {/* Forms Side */}
            <div className="lg:col-span-7 space-y-16">
              
              {/* Consultation Booking Section */}
              <div id="consultation" className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border-2 border-[#f8a4b9]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f8a4b9]/5 rounded-bl-[5rem] -mr-8 -mt-8" />
                
                <div className="mb-12 relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8a4b9]/10 rounded-full mb-6">
                    <Stethoscope className="w-4 h-4 text-[#f8a4b9]" />
                    <span className="text-xs font-bold text-[#f8a4b9] uppercase tracking-wider">Professional Service</span>
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-4">Book a Professional Consultation</h2>
                  <p className="text-gray-500 mb-6">Receive expert guidance, legal overview, and a personalized surrogacy roadmap tailored to your specific needs.</p>
                  
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-[#f8a4b9]" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consultation Fee</p>
                          <p className="text-2xl font-bold text-[#1a1a1a]">{siteSettings.consultation_fee || '$100'}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                       <p className="font-bold text-gray-700">45 - 60 Mins</p>
                    </div>
                  </div>
                </div>

                <form id="consultation-form" onSubmit={handleSubmit} className="space-y-6">
                   <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                      <Input name="firstName" placeholder="John" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                      <Input name="lastName" placeholder="Doe" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <Input name="email" type="email" placeholder="john@example.com" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <Input name="phone" type="tel" placeholder="+..." required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Location</label>
                      <Input name="location" placeholder="City, Country" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Preferred Date</label>
                      <Input name="preferredDate" type="date" required className="bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Brief Background / Questions</label>
                    <Textarea 
                      name="message" 
                      placeholder="Share a bit about your journey so far..." 
                      className="bg-gray-50 border-none rounded-[2rem] min-h-[120px] p-6 focus:ring-2 focus:ring-[#f8a4b9]/20"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white py-8 rounded-2xl font-bold text-lg shadow-xl transition-all"
                  >
                    {isSubmitting ? 'Processing...' : 'Request Consultation Appointment'}
                  </Button>
                  <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest mt-4">
                    After submission, our coordinator will contact you with available time slots and payment options.
                  </p>
                </form>
              </div>

              {/* General Message Section */}
              <div id="message" className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border border-[#f0e7ec]">
                <div className="mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">General Inquiry</span>
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-4">Send us a Message</h2>
                  <p className="text-gray-500">Have a quick question? Use the form below or reach out via our social media channels.</p>
                </div>

                <form id="general-form" onSubmit={handleSubmit} className="space-y-8">
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
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Inquiry Type</label>
                      <select name="inquiryType" className="w-full bg-gray-50 border-none rounded-2xl h-14 px-6 focus:ring-2 focus:ring-[#f8a4b9]/20 text-sm font-medium outline-none appearance-none">
                        <option value="intended-parent">General Intended Parent Inquiry</option>
                        <option value="surrogate-interest">General Surrogate Interest</option>
                        <option value="egg-donation">General Egg Donation Inquiry</option>
                        <option value="other">Other General Inquiry</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-6">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Free Consultation?</span>
                       <a href="#consultation" className="text-xs font-bold text-[#f8a4b9] flex items-center gap-1 hover:underline">
                          Switch to Booking <ChevronRight className="w-3 h-3" />
                       </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
                    <Textarea 
                      name="message" 
                      placeholder="How can we help you today?" 
                      className="bg-gray-50 border-none rounded-[2rem] min-h-[150px] p-8 focus:ring-2 focus:ring-[#f8a4b9]/20"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-[#f8a4b9] hover:bg-[#e88aa3] text-white py-8 rounded-2xl font-bold text-lg shadow-lg shadow-[#f8a4b9]/20 transition-all hover:scale-[1.01]"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
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
            <a href="https://instagram.com/geb_surrogacy_services" target="_blank" className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#e4405f] transition-colors"><Instagram className="w-6 h-6" /> Instagram</a>
            <a href="https://facebook.com/share/192smxW7GG/" target="_blank" className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#1877f2] transition-colors"><Facebook className="w-6 h-6" /> Facebook</a>
            <a href="https://wa.me/2347034270722" target="_blank" className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#25d366] transition-colors"><MessageCircle className="w-6 h-6" /> WhatsApp</a>
            <a href="mailto:gebsurrogacyservices@gmail.com" className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#f8a4b9] transition-colors"><Mail className="w-6 h-6" /> Email</a>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-gray-400 text-xs">
        <p>&copy; {new Date().getFullYear()} GEB Surrogacy Services. All rights reserved.</p>
      </footer>
    </div>
  )
}
