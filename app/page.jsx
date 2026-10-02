import { getHubs, getChildren } from '../lib/data'

export default function Home() {
  const hubs = getHubs()
  const modelHubs = hubs.filter(h => h.type !== undefined) // type не выбран; группируем по url
  const models = hubs.filter(h => /^\/[a-z-]+\/$/.test(h.url_path) && h.model)
  const nodes = hubs.filter(h => !(h.model && h.url_path === '/' + h.model + '/'))
  return (
    <div>
      <h1>КиаГид — руководство по Kia</h1>
      <p className="lead">
        Практические инструкции по обслуживанию и ремонту автомобилей Kia: что ломается,
        как проверить, как заменить и сколько это стоит. Каждая статья отвечает на реальные
        запросы владельцев — от лампы ближнего света до замены АКПП.
      </p>
      <h2>Выберите модель</h2>
      <div className="hub-grid">
        {models.map(h => <a key={h.url_path} href={h.url_path}>{h.title || h.model}</a>)}
      </div>
      <h2>Популярные узлы</h2>
      <div className="hub-grid">
        {nodes.map(h => <a key={h.url_path} href={h.url_path}>{h.title || h.node}</a>)}
      </div>
    </div>
  )
}
