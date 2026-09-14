import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  businessName?: string
  reviewerName?: string
  verdictLabel?: string
  confidence?: number
  headline?: string
}

const Email = ({ name, businessName, reviewerName, verdictLabel, confidence, headline }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your scan report for {businessName ?? 'a review'} is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Scan report ready</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          Your review scan has finished and the full AI policy report is now available in your
          Removal Work dashboard.
        </Text>
        <Container style={card}>
          <Text style={row}><strong>Business:</strong> {businessName ?? 'Unknown'}</Text>
          <Text style={row}><strong>Reviewer:</strong> {reviewerName ?? 'Unknown'}</Text>
          <Text style={row}><strong>Verdict:</strong> {verdictLabel ?? 'Completed'}</Text>
          {typeof confidence === 'number' ? (
            <Text style={row}><strong>Confidence:</strong> {confidence}%</Text>
          ) : null}
          {headline ? <Text style={row}><strong>Summary:</strong> {headline}</Text> : null}
        </Container>
        <Text style={muted}>
          Open your dashboard to read the evidence, counter-evidence and recommended action. This
          report is an AI policy assessment — Removal Work never submits a report or changes a
          review without your confirmation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Scan report ready — ${data['businessName'] ?? 'review checked'}`,
  displayName: 'Scan report ready',
  previewData: {
    name: 'Aisha',
    businessName: 'Eiffel Tower',
    reviewerName: 'Chia Paknahad',
    verdictLabel: 'No clear policy violation',
    confidence: 99,
    headline: 'This review shows no clear reason to report it.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { color: '#0f172a', fontSize: '22px' }
const text = { color: '#1f2937', fontSize: '14px', lineHeight: '22px' }
const muted = { color: '#6b7280', fontSize: '12px', lineHeight: '18px' }
const card = {
  backgroundColor: '#f0fdfa',
  border: '1px solid #99f6e4',
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '12px 0',
}
const row = { color: '#134e4a', fontSize: '13px', lineHeight: '20px', margin: '4px 0' }
