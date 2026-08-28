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
import type { TipoAlerta } from '../api/types'

// Os ids agora são UUIDs vindos de dim_aparelho, então o ícone é escolhido
// pela categoria (dim_aparelho.categoria) com o nome como desempate.
const ICONES_CATEGORIA: Record<string, LucideIcon> = {
  Climatização: Snowflake,
  Aquecimento: ShowerHead,
  Refrigeração: Refrigerator,
  Lavanderia: WashingMachine,
  Eletrônicos: Tv,
  Iluminação: Lightbulb,
}

const ICONES_NOME: Record<string, LucideIcon> = {
  'ar-condicionado': Snowflake,
  chuveiro: ShowerHead,
  geladeira: Refrigerator,
  'máquina de lavar': WashingMachine,
  'tv + eletrônicos': Tv,
  iluminação: Lightbulb,
}

export function DeviceIcon({
  categoria,
  nome,
  size = 18,
  className = '',
}: {
  categoria?: string
  nome?: string
  size?: number
  className?: string
}) {
  const Icon =
    (categoria ? ICONES_CATEGORIA[categoria] : undefined) ??
    (nome ? ICONES_NOME[nome.toLowerCase()] : undefined) ??
    Plug
  return <Icon size={size} strokeWidth={1.6} className={className} />
}

// Glifos de alerta consistentes (linha, não emoji do sistema).
const ICONES_ALERTA: Record<TipoAlerta, LucideIcon> = {
  'over-average': Activity,
  'no-signal': TriangleAlert,
  achievement: CircleCheck,
}

export function AlertIcon({
  tipo,
  size = 18,
  className = '',
}: {
  tipo: TipoAlerta
  size?: number
  className?: string
}) {
  const Icon = ICONES_ALERTA[tipo] ?? Activity
  return <Icon size={size} strokeWidth={1.6} className={className} />
}
