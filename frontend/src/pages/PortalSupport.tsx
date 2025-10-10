import { FaqAccordion } from '@/components/support/FaqAccordion';

export default function PortalSupport() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Support Center</h1>
        <p className="text-sm text-gray-500">
          Find answers to common questions or get in touch with our team.
        </p>
      </div>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-semibold text-gray-900">
          Frequently Asked Questions
        </h2>
        <div className="mt-4">
          <FaqAccordion />
        </div>
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="text-lg font-semibold text-gray-900">
          Contact Us
        </h2>
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-gray-600">
            If you can&apos;t find the answer you&apos;re looking for, please email us at{' '}
            <a
              href="mailto:support@interdomestik.app"
              className="font-medium text-indigo-600 hover:underline"
            >
              support@interdomestik.app
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

