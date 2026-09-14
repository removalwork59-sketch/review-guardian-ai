import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface ContactMessageProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

function ContactMessageEmail({
  name = 'Website visitor',
  email = '',
  subject = 'New message',
  message = '',
}: ContactMessageProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New contact message from ${name}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>New contact message</Heading>
          <Text style={styles.meta}>Removal Work website contact form</Text>
          <Hr style={styles.hr} />
          <Section>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{name}</Text>
            <Text style={styles.label}>Reply-to email</Text>
            <Text style={styles.value}>{email || 'Not provided'}</Text>
            <Text style={styles.label}>Subject</Text>
            <Text style={styles.value}>{subject}</Text>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.messageBox}>{message}</Text>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Sent from the Removal Work contact form. Reply directly to this email to
            respond to the sender.
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
  meta: { fontSize: '13px', color: '#64748b', margin: '0' } as const,
  hr: { borderColor: '#e2e8f0', margin: '20px 0' } as const,
  label: {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#64748b',
    margin: '14px 0 2px',
  },
  value: { fontSize: '15px', color: '#0f172a', margin: '0' } as const,
  messageBox: {
    fontSize: '15px',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    padding: '14px',
    whiteSpace: 'pre-wrap' as const,
    margin: '0',
  },
  footer: { fontSize: '12px', color: '#94a3b8', margin: '0' } as const,
}

export const template = {
  component: ContactMessageEmail,
  subject: (data: Record<string, any>) =>
    `Contact form: ${data['subject'] || 'New message'} — ${data['name'] || 'Visitor'}`,
  displayName: 'Contact form message',
  previewData: {
    name: 'Aisha Khan',
    email: 'aisha@example.com',
    subject: 'Review removal inquiry',
    message: 'Hi, I would like help with a review on my business listing.',
  },
  to: 'removalwork59@gmail.com',
} satisfies TemplateEntry
