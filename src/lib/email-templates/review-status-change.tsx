import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface ReviewStatusChangeProps {
  businessName?: string
  siteName?: string
  platform?: string
  reviewerName?: string
  reviewRating?: number | null
  reviewText?: string
  verdictLabel?: string
  confidence?: number
  oldStatus?: string
  newStatus?: string
  statusNote?: string
  caseId?: string
  dashboardUrl?: string
}

function ReviewStatusChangeEmail({
  businessName = 'Unknown business',
  siteName = '',
  platform = 'google',
  reviewerName = 'Unknown reviewer',
  reviewRating = null,
  reviewText = '',
  verdictLabel = 'Completed',
  confidence,
  oldStatus = 'new',
  newStatus = 'reported',
  statusNote = '',
  caseId = '',
  dashboardUrl = '',
}: ReviewStatusChangeProps) {
  const subjectLine = `Review status changed to ${newStatus} — ${businessName}`
  const replySubject = encodeURIComponent(
    `Re: Review status update for ${businessName}${caseId ? ` (case ${caseId.slice(0, 8)})` : ''}`
  )
  const replyLink = `mailto:removalwork59@gmail.com?subject=${replySubject}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subjectLine}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Review status updated</Heading>
          <Text style={styles.meta}>
            A review for <strong>{businessName}</strong> was moved from{" "}
            <em>{oldStatus}</em> to <em style={styles.highlight}>{newStatus}</em>.
          </Text>

          <Hr style={styles.hr} />

          <Section>
            <Text style={styles.label}>Site / Platform</Text>
            <Text style={styles.value}>
              {siteName || businessName} ({platform})
            </Text>

            <Text style={styles.label}>Reviewer</Text>
            <Text style={styles.value}>
              {reviewerName}
              {typeof reviewRating === 'number' ? ` — ${reviewRating}/5 stars` : ''}
            </Text>

            <Text style={styles.label}>Review snippet</Text>
            <Text style={styles.quote}>
              {reviewText ? `“${reviewText.slice(0, 280)}${reviewText.length > 280 ? '…' : ''}”` : 'No review text available'}
            </Text>

            <Text style={styles.label}>AI verdict</Text>
            <Text style={styles.value}>
              {verdictLabel}
              {typeof confidence === 'number' ? ` — ${confidence}% confidence` : ''}
            </Text>

            {statusNote ? (
              <>
                <Text style={styles.label}>Status note</Text>
                <Text style={styles.noteBox}>{statusNote}</Text>
              </>
            ) : null}
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.actions}>
            {dashboardUrl ? (
              <Button href={dashboardUrl} style={styles.primaryButton}>
                Open dashboard
              </Button>
            ) : null}
            <Button href={replyLink} style={styles.secondaryButton}>
              Reply to Removal Work
            </Button>
          </Section>

          <Text style={styles.footer}>
            This is an automated update from Removal Work. If you did not make this change,
            reply to this email and we will investigate.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: { backgroundColor: '#0b1220', padding: '24px 0' } as const,
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '560px',
  } as const,
  heading: { fontSize: '22px', color: '#0f172a', margin: '0 0 4px' } as const,
  meta: { fontSize: '14px', color: '#334155', margin: '0 0 18px', lineHeight: '22px' } as const,
  highlight: { color: '#0d9488', fontWeight: 600 } as const,
  hr: { borderColor: '#e2e8f0', margin: '20px 0' } as const,
  label: {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#64748b',
    margin: '14px 0 2px',
  },
  value: { fontSize: '15px', color: '#0f172a', margin: '0', lineHeight: '22px' } as const,
  quote: {
    fontSize: '15px',
    color: '#334155',
    fontStyle: 'italic' as const,
    margin: '0',
    lineHeight: '22px',
  },
  noteBox: {
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#f0fdfa',
    border: '1px solid #ccfbf1',
    borderRadius: '8px',
    padding: '12px',
    margin: '0',
    lineHeight: '20px',
  },
  actions: {
    textAlign: 'center' as const,
    margin: '8px 0 16px',
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
    margin: '0 8px 8px 0',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    color: '#0f766e',
    border: '1px solid #0f766e',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '18px' } as const,
}

export const template = {
  component: ReviewStatusChangeEmail,
  subject: (data: Record<string, any>) =>
    `Review status changed to ${data['newStatus'] || 'updated'} — ${data['businessName'] || 'a review'}`,
  displayName: 'Review status change',
  previewData: {
    businessName: 'Eiffel Tower',
    siteName: 'Eiffel Tower, Paris',
    platform: 'google',
    reviewerName: 'Chia Paknahad',
    reviewRating: 5,
    reviewText: 'Great experience, would recommend to anyone visiting Paris.',
    verdictLabel: 'No violation',
    confidence: 99,
    oldStatus: 'new',
    newStatus: 'reported',
    statusNote: 'User marked as submitted to Google.',
    caseId: '00000000-0000-0000-0000-000000000000',
    dashboardUrl: 'https://removalwork.online/scans',
  },
} satisfies TemplateEntry
