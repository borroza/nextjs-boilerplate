import { getHubs } from '../lib/data'
import { modelDisplay, nodeDisplay } from '../lib/util'

export const metadata = {
  alternates: { canonical: '/' },
  openGraph: { title: 'КиаГид — руководство по Kia', description: 'Практические инструкции по обслуживанию и ремонту Kia: диагностика, замена, выбор запчастей. Реальные ответы на запросы владельцев.', locale: 'ru_RU', type: 'website' }
}

export default function Home() {
  const hubs = getHubs()
  const models = hubs.filter(h => h.type === 'hub-model').sort((a, b) => a.model.localeCompare(b.model))
  const nodes = hubs.filter(h => h.type === 'hub-node').slice(0, 18)
  return (
    <div>
      <h1>КиаГид — руководство по Kia</h1>
      <p className="lead">
        КиаГид — практический справочник по обслуживанию и ремонту автомобилей Kia.
        Каждая статья отвечает на конкретный вопрос владельца: почему не работает узел,
        как его проверить, заменить и что учесть при выборе запчастей. Все материалы
        написаны по реальным запросам владельцев — от лампы ближнего света до замены
        масла в АКПП. Точные характеристики (моменты затяжки, объёмы заправки, артикулы)
        указаны по данным каталога производителя или помечены как типовые.
      </p>
      <h2>Выберите модель</h2>
      <div className="model-grid">
        {models.map(h => (
          <a key={h.url_path} href={h.url_path} className="model-card">
            <span className="model-badge">{modelDisplay(h.model).charAt(0)}</span>
            <span className="model-name">Kia {modelDisplay(h.model)}</span>
          </a>
        ))}
      </div>
      <h2>Популярные узлы</h2>
      <div className="model-grid">
        {nodes.map(h => (
          <a key={h.url_path} href={h.url_path} className="model-card">
            <span className="node-name">{nodeDisplay(h.node)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
