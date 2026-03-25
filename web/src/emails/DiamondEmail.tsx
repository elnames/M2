import {
  Html, Head, Body, Container, Section, Heading, Text, Button,
  Hr, Row, Column, Img, Preview,
} from '@react-email/components'

interface Property {
  titulo?: string
  comuna?: string
  tipo?: string
  m2?: number
  precio_uf?: number
  valor_justo_uf?: number
  opportunity_score?: number
  diferencia_pct?: number
  url?: string
}

interface Props {
  properties: Property[]
  totalDiamantes: number
}

const scoreColor = (score: number) => {
  if (score >= 90) return '#ef4444'
  if (score >= 80) return '#f59e0b'
  if (score >= 70) return '#eab308'
  return '#34d399'
}

export function DiamondAlertEmail({ properties, totalDiamantes }: Props) {
  const preview = `${totalDiamantes} oportunidades diamante detectadas · ${properties[0]?.comuna ?? 'Santiago'}`

  return (
    <Html lang='es'>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#020617', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Heading style={{ color: '#34d399', fontSize: '28px', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              m²
            </Heading>
            <Text style={{ color: '#64748b', fontSize: '12px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Alerta de Oportunidades
            </Text>
          </Section>

          {/* Title card */}
          <Section style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.05) 100%)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <Text style={{ fontSize: '40px', margin: '0 0 12px' }}>💎</Text>
            <Heading style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>
              {totalDiamantes} Oportunidades Diamante
            </Heading>
            <Text style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              El motor de análisis detectó propiedades con score alto y rentabilidad atractiva
            </Text>
          </Section>

          {/* Properties list */}
          <Section style={{ marginBottom: '24px' }}>
            <Heading style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
              Top Oportunidades Detectadas
            </Heading>

            {properties.slice(0, 10).map((p, i) => {
              const score = p.opportunity_score ?? 0
              const color = scoreColor(score)
              return (
                <Section key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '10px',
                }}>
                  <Row>
                    <Column style={{ width: '85%' }}>
                      <Text style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700', margin: '0 0 4px', lineHeight: 1.4 }}>
                        {p.titulo?.slice(0, 60) ?? 'Propiedad'}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>
                        📍 {p.comuna ?? '—'}{p.tipo ? ` · ${p.tipo}` : ''}{p.m2 ? ` · ${p.m2} m²` : ''}
                      </Text>
                      <Row>
                        <Column>
                          <Text style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Precio</Text>
                          <Text style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                            {p.precio_uf?.toLocaleString('es-CL') ?? '—'} UF
                          </Text>
                        </Column>
                        <Column style={{ paddingLeft: '20px' }}>
                          <Text style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Valor Justo</Text>
                          <Text style={{ color: '#34d399', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                            {p.valor_justo_uf?.toLocaleString('es-CL') ?? '—'} UF
                          </Text>
                        </Column>
                        {p.diferencia_pct && (
                          <Column style={{ paddingLeft: '20px' }}>
                            <Text style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Descuento</Text>
                            <Text style={{ color: '#34d399', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                              +{p.diferencia_pct?.toFixed(1)}%
                            </Text>
                          </Column>
                        )}
                      </Row>
                    </Column>
                    <Column style={{ width: '15%', textAlign: 'right', verticalAlign: 'middle' }}>
                      <Text style={{ color: color, fontSize: '24px', fontWeight: '900', margin: '0 0 2px', lineHeight: 1 }}>
                        {Math.round(score)}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>/ 100</Text>
                    </Column>
                  </Row>
                  {p.url && (
                    <Button href={p.url} style={{
                      display: 'inline-block',
                      marginTop: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(52,211,153,0.3)',
                      borderRadius: '6px',
                      color: '#34d399',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '6px 14px',
                      textDecoration: 'none',
                    }}>
                      Ver publicación →
                    </Button>
                  )}
                </Section>
              )
            })}
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Button href='https://m2.nmsdev.tech/dashboard' style={{
              background: '#10b981',
              borderRadius: '10px',
              color: '#000',
              fontSize: '14px',
              fontWeight: '700',
              padding: '14px 32px',
              textDecoration: 'none',
            }}>
              Ver todas en el dashboard →
            </Button>
          </Section>

          <Hr style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '0 0 24px' }} />

          <Text style={{ color: '#475569', fontSize: '11px', textAlign: 'center', margin: 0 }}>
            m² · Plataforma de análisis inmobiliario · m2.nmsdev.tech
            <br />
            Recibes este correo porque eres administrador de la plataforma.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
