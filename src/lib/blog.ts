export type BlogSection = { heading: string; paragraphs: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "google-review-policy-violations",
    title: "How to Tell If a Google Review Actually Breaks the Rules",
    description:
      "Not every unfair review violates Google policy. Learn the specific violation categories Google acts on — and the ones it ignores — before you report.",
    date: "2026-09-10",
    readingTime: "5 min read",
    sections: [
      {
        heading: "Feeling unfair is not a policy violation",
        paragraphs: [
          "The most common mistake businesses make is reporting a review because it feels wrong. Google does not remove reviews for being harsh, exaggerated, or one-sided. A one-star review that says 'worst service ever' is an opinion, and opinions are protected.",
          "Removal only happens when a review breaks a specific written policy. Knowing the difference saves you time and keeps your reports credible.",
        ],
      },
      {
        heading: "Categories Google actually acts on",
        paragraphs: [
          "Fake engagement: reviews from people who never interacted with the business, review rings, or incentivized ratings. Spam: duplicate, off-topic, or promotional content. Conflict of interest: reviews from owners, employees, or competitors.",
          "Other enforced categories include harassment and hate speech, personal information (doxxing), sexually explicit content, and dangerous or illegal content. Each has a specific definition in Google's prohibited and restricted content policy.",
        ],
      },
      {
        heading: "What usually does not qualify",
        paragraphs: [
          "Genuine bad experiences, even described rudely. Pricing disputes. Reviews you simply disagree with. Reporting these wastes your attempt and, more importantly, clogs the process for everyone.",
          "This is exactly why Removal Work tells you when a review is NOT reportable — a wrong report is worse than no report.",
        ],
      },
      {
        heading: "Check before you report",
        paragraphs: [
          "Paste the review link into the scanner on our homepage. The AI checks the review text against the policy categories above, shows you the evidence for and against, and only prepares a report when a real violation is found.",
        ],
      },
    ],
  },
  {
    slug: "review-report-evidence",
    title: "What Evidence Makes a Review Report Stronger",
    description:
      "A report with evidence outperforms a complaint. Here's what to collect — transaction records, timelines, reviewer patterns — before you flag a review.",
    date: "2026-09-08",
    readingTime: "4 min read",
    sections: [
      {
        heading: "Why evidence matters",
        paragraphs: [
          "When you flag a review, a moderator decides quickly. A report that says 'this is fake' goes nowhere. A report that shows the reviewer was never a customer, or that the same text appears on ten other businesses, is different.",
        ],
      },
      {
        heading: "What to collect",
        paragraphs: [
          "Customer records: check whether the reviewer name appears in your bookings, invoices, or support tickets. Timeline: does the review date match any real visit? Cross-posting: search the exact review text — identical text on multiple businesses is strong fake-engagement evidence.",
          "Reviewer profile: a brand-new profile with one review, or a profile that only leaves one-star reviews for one industry, supports a fake-engagement case.",
        ],
      },
      {
        heading: "Keep it factual",
        paragraphs: [
          "Document what you can verify, and be honest about what you cannot. Removal Work's analysis separates evidence from missing evidence deliberately — a report built on guesses fails, and an overstated report can backfire.",
        ],
      },
    ],
  },
  {
    slug: "after-you-report-a-review",
    title: "What Happens After You Report a Google Review",
    description:
      "Reporting is the start, not the finish. Realistic timelines, the appeal path, and how to track outcomes honestly.",
    date: "2026-09-05",
    readingTime: "4 min read",
    sections: [
      {
        heading: "The review process",
        paragraphs: [
          "After you flag a review, Google's moderation evaluates it against policy. There is no public API for report status — no tool, including ours, can tell you Google's internal decision automatically. Anyone promising that is not being honest with you.",
        ],
      },
      {
        heading: "Realistic timelines",
        paragraphs: [
          "Initial decisions can take days to weeks. If the report is declined, Google offers a one-time appeal for eligible reviews. An appeal is a second look, not a guarantee.",
        ],
      },
      {
        heading: "Track it yourself",
        paragraphs: [
          "Because Google does not publish outcomes, your own records are the source of truth. In Removal Work you mark the outcome yourself — removed, kept, or pending — so your Reports page always reflects what actually happened, nothing invented.",
        ],
      },
      {
        heading: "When the review stays",
        paragraphs: [
          "If a genuine review stays up, the honest options remain: respond professionally to the review, fix the underlying issue, and build more genuine reviews. A policy tool helps with rule-breakers; reputation is still earned.",
        ],
      },
    ],
  },
];

export function getPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
