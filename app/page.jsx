import { getHubs } from '../lib/data'
import { modelDisplay, nodeDisplay } from '../lib/util'

export default function Home() {
  const hubs = getHubs()
  const models = hubs.filter(h => h.type === 'hub-model').sort((a, b) => a.model.localeCompare(b.model))
  const nodes = hubs.filter(h => h.type === 'hub-node').slice(0, 18)
  return (
    <div>
      <h1>КиаГид — руководство по Kia</h1>
      <p className="lead">
        Практические инструкции по обслуживанию и ремонту автомобилей Kia: что ломается,
        как проверить, как заменить и сколько это стоит. Каждая статья отвечает на реальные
        запросы владельцев — от лампы ближнего света до замены АКПП.
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
