import type { Metadata } from "next"

import { siteConfig } from "@/lib/site-config"
import { Container, Section } from "@/components/section"
import { PageHero } from "@/components/page-hero"

export const metadata: Metadata = {
  title: "Privacy Notice & Terms of Use",
  description:
    "How Solar Works collects, uses, retains, and protects the information you share through our lead forms and chatbot.",
}

const sections = [
  {
    heading: "1. Information we collect",
    body: "When you submit a form or chat with our Solar Assistant, we collect the details you provide — such as your name, mobile number, email, installation address, property type, energy usage, and preferences — along with basic technical data like the page you arrived from and campaign parameters (UTM tags).",
  },
  {
    heading: "2. How we use your information",
    body: "We use your information solely to prepare your solar assessment, contact you about your inquiry, and improve our service. We do not sell your personal information to third parties.",
  },
  {
    heading: "3. Consent",
    body: "We only contact you and store your details after you have given explicit consent through the form or chatbot. You may withdraw consent at any time by contacting us.",
  },
  {
    heading: "4. Data retention",
    body: "We retain lead information for as long as necessary to serve your inquiry and meet legitimate business and legal requirements. You may request deletion of your information at any time.",
  },
  {
    heading: "5. Data storage & security",
    body: "Your information is stored securely. Access is limited to authorized Solar Works personnel and the integration services that process your inquiry. We use industry-standard safeguards including encrypted connections.",
  },
  {
    heading: "6. Your rights",
    body: "You have the right to access, correct, or request deletion of your personal information, and to withdraw consent. To exercise these rights, contact us using the details below.",
  },
  {
    heading: "7. Terms of use",
    body: "Information on this website, including any savings figures or system examples, is provided for general guidance and does not constitute a binding quotation or guarantee. Final system design, pricing, and performance depend on a site assessment.",
  },
]

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Notice & Terms of Use"
        description="Last updated June 2026. This explains how we handle the information you share with us."
      />
      <Section>
        <Container className="max-w-3xl">
          <div className="flex flex-col gap-8">
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="text-xl font-semibold">{s.heading}</h2>
                <p className="mt-2 text-muted-foreground text-pretty">{s.body}</p>
              </div>
            ))}
            <div className="rounded-2xl border bg-muted/30 p-6">
              <h2 className="text-xl font-semibold">8. Contact us</h2>
              <p className="mt-2 text-muted-foreground">
                Questions about this notice or your data? Reach {siteConfig.legalName} at{" "}
                <a href={siteConfig.contact.email.href} className="font-medium text-primary-strong hover:underline">
                  {siteConfig.contact.email.value}
                </a>{" "}
                or {siteConfig.contact.phone.value}.
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
