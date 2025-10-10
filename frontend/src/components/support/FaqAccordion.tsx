import { useState } from 'react';

const faqs = [
  {
    question: 'How do I renew my membership?',
    answer:
      'You can renew your membership from the Billing page in your portal. An invoice will be available 30 days before your expiration date.',
  },
  {
    question: 'Where can I find my membership card?',
    answer:
      'Your digital membership card is available on your Profile page. You can save it to your phone or print it.',
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={faq.question} className="rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left font-semibold text-gray-800"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
            >
              <span>{faq.question}</span>
              <span
                className={`transform transition-transform ${
                  isOpen ? '-rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            {isOpen ? (
              <div className="p-4 pt-0 text-gray-600">
                <p>{faq.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

