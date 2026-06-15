import {
  Activity,
  CircleCheck,
  Lightbulb,
  type LucideIcon,
  Plug,
  Refrigerator,
  ShowerHead,
  Snowflake,
  TriangleAlert,
  Tv,
  WashingMachine,
} from 'lucide-react'
import type { AlertItem } from '../data/mock'

// Mapeia o id do aparelho (mock.ts intocado) para um ícone de linha monocromático.
const DEVICE_ICONS: Record<string, LucideIcon> = {
  'ar-condicionado': Snowflake,
  chuveiro: ShowerHead,
  geladeira: Refrigerator,
  'maquina-lavar': WashingMachine,
  'tv-eletronicos': Tv,
  iluminacao: Lightbulb,
}

export function DeviceIcon({
  id,
  size = 18,
  className = '',
}: {
  id: string
  size?: number
  className?: string
}) {
  const Icon = DEVICE_ICONS[id] ?? Plug
  return <Icon size={size} strokeWidth={1.6} className={className} />
}

// Glifos de alerta consistentes (linha, não emoji do sistema).
const ALERT_ICONS: Record<AlertItem['kind'], LucideIcon> = {
  'over-average': Activity,
  'no-signal': TriangleAlert,
  achievement: CircleCheck,
}

export function AlertIcon({
  kind,
  size = 18,
  className = '',
}: {
  kind: AlertItem['kind']
  size?: number
  className?: string
}) {
  const Icon = ALERT_ICONS[kind]
  return <Icon size={size} strokeWidth={1.6} className={className} />
}
