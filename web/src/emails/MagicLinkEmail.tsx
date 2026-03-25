import {
  Html, Head, Body, Container, Section, Heading, Text, Button,
  Hr, Preview,
} from '@react-email/components'

interface Props {
  url: string
  host: string
}

export function MagicLinkEmail({ url, host }: Props) {
  return (
    <Html lang='es'>
      <Head />
      <Preview>Tu enlace de acceso a m² · Expira en 24 horas</Preview>
      <Body style={{ backgroundColor: '#020617', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 16px' }}>

          {/* Logo */}
          <Section style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Heading style={{ color: '#34d399', fontSize: '32px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-1px' }}>
              m²
            </Heading>
            <Text style={{ color: '#64748b', fontSize: '12px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Plataforma de Inversión Inmobiliaria
            </Text>
          </Section>

          {/* Main card */}
          <Section style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '36px 32px',
            marginBottom: '24px',
          }}>
            <Text style={{ fontSize: '32px', textAlign: 'center', margin: '0 0 20px' }}>🔐</Text>
            <Heading style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: '800', textAlign: 'center', margin: '0 0 12px' }}>
              Tu enlace de acceso
            </Heading>
            <Text style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', lineHeight: 1.6, margin: '0 0 28px' }}>
              Haz clic en el botón para iniciar sesión en m².
              Este enlace expira en <strong style={{ color: '#f1f5f9' }}>24 horas</strong> y solo puede usarse una vez.
            </Text>

            <Button href={url} style={{
              display: 'block',
              background: '#10b981',
              borderRadius: '12px',
              color: '#000',
              fontSize: '15px',
              fontWeight: '800',
              padding: '15px 32px',
              textDecoration: 'none',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              Iniciar sesión en m²
            </Button>

            <Text style={{ color: '#475569', fontSize: '11px', textAlign: 'center', margin: '20px 0 0', lineHeight: 1.5 }}>
              Si no solicitaste este enlace, ignora este mensaje.
              Tu cuenta permanece segura.
            </Text>
          </Section>

          {/* Alt link */}
          <Section style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '32px',
          }}>
            <Text style={{ color: '#64748b', fontSize: '11px', margin: '0 0 6px' }}>
              ¿El botón no funciona? Copia este enlace en tu navegador:
            </Text>
            <Text style={{ color: '#34d399', fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
              {url}
            </Text>
          </Section>

          <Hr style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '0 0 20px' }} />

          <Text style={{ color: '#334155', fontSize: '11px', textAlign: 'center', margin: 0 }}>
            m² · {host} · Análisis de inversión inmobiliaria para el Gran Santiago
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
