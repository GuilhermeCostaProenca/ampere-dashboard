# ⚡ Amperê — Dashboard NILM (Protótipo de Alta Fidelidade)

Protótipo funcional do **Amperê**, sistema de monitoramento energético residencial baseado em
**NILM (Non-Intrusive Load Monitoring)**: um único sensor (ESP32 + SCT-013) no quadro elétrico
identifica, via IA, o consumo individual de cada aparelho da casa — exibindo tudo em **R$** (não em kWh).

> Entregue como protótipo de alta fidelidade (código real) do Checkpoint **"É Hora de Prototipar"** —
> curso **Startup One (FIAP)**.

---

## 🎨 Estética

Painel de controle estilo **HUD NASA/ESA / cockpit**:
fundo grafite, verde-terminal (`#00FF66`), acentos em âmbar para alertas, tipografia monoespaçada
(JetBrains Mono), gráficos estilo **osciloscópio** com glow, grid sutil e marcadores de mira nos cantos.

## 🧩 Telas

| Rota              | Tela                                                                 |
| ----------------- | ------------------------------------------------------------------- |
| `/`               | **Dashboard** — gasto do mês, consumo agora, gasto hoje, top aparelhos, uso 24h, bandeira |
| `/aparelhos`      | **Aparelhos** — lista de cargas identificadas pelo NILM            |
| `/aparelhos/:id`  | **Detalhe** — curva 24h, custo, comparação com média, ROI         |
| `/alertas`        | **Alertas** — acima da média, sem leitura, conquistas             |
| `/relatorio`      | **Relatório mensal** — total R$/kWh, distribuição, dica           |
| `/config`         | **Configurações** — usuário, plano, status do sensor              |

## 🛠 Stack

- **React + Vite + TypeScript**
- **Tailwind CSS** (tema HUD customizado em `tailwind.config.js`)
- **Recharts** (gráficos osciloscópio / pizza)
- **React Router** (navegação SPA)
- Dados **100% mockados** em [`src/data/mock.ts`](src/data/mock.ts)

## ▶️ Como rodar

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (ex.: `http://localhost:5173`).

Outros comandos:

```bash
npm run build     # build de produção (dist/)
npm run preview   # serve o build localmente
```

## 📁 Estrutura

```
src/
├─ components/      # Hud (Panel, Metric, Bar...), Scope, Layout, TariffFlag
├─ pages/           # Dashboard, Devices, DeviceDetail, Alerts, Report, Settings
├─ data/mock.ts     # ÚNICA fonte de dados — trocar por API na Fase 5
├─ App.tsx          # rotas
└─ main.tsx         # entry
```

## 🔌 Caminho para a Fase 5 (Cloud)

Toda a UI consome a camada [`src/data/mock.ts`](src/data/mock.ts). Para plugar dados reais
(ESP32 → nuvem AWS/Azure/GCP → API), basta substituir os `export` desse arquivo por chamadas
assíncronas mantendo os mesmos **tipos** (`Device`, `AlertItem`, `ReportSlice`...). Nenhum componente
precisa mudar.

## 🚫 Fora de escopo (Fase 5)

Autenticação real · backend / banco de dados · API · integração com hardware ESP32 · Cloud Computing.

---

**Responsivo** — sidebar no desktop, bottom-nav no mobile. Dados simulados para fins de demonstração.
