---
layout: default
title: "El Mapa y el Territorio"
---

# El Mapa y el Territorio

<a href="img/06-map-becomes-territory.jpg" class="img-link float-right">
  <img src="img/06-map-becomes-territory.jpg" alt="El mapa se convierte en territorio">
</a>

Regina tiene su modelo de datos en Kotlin, una réplica exacta de su visión en YAML. Ahora la pregunta clave:

> *"¿Cómo hago para que el programa lea mi archivo YAML y cree estos objetos automáticamente? No quiero escribir un parser manual"*.

---

## El Grafo de Objetos

Dárico le explica: *"Piensa en un organigrama. Tienes un gerente general, que tiene varios directores a su cargo. Tu archivo YAML es exactamente eso: un organigrama de tu configuración"*.

*"La belleza es que no tienes que construir ese grafo a mano. Usamos **Jackson**, un 'traductor' universal"*.

---

## La Magia en Una Línea

```kotlin
fun main() {
    // 1. Crear el "traductor" para YAML y Kotlin
    val mapper = ObjectMapper(YAMLFactory())
        .registerModule(KotlinModule.Builder().build())

    // 2. ¡LA MAGIA! Leer el YAML y construir el grafo
    val model: Model = mapper.readValue(configInputStream)

    // 3. A partir de aquí, todo trabaja con "model"
    val server = Server(model)
    server.start()
}
```

Con una sola línea, `mapper.readValue(...)`, *todo* el complejo archivo YAML se transforma en un objeto `Model` vivo y navegable.

No hay bucles. No hay `if`s. No hay parsing manual.

> **¡El mapa se ha convertido en el territorio!**

---

<div class="nav">
  <a class="prev" href="05-model.html">← Anterior</a>
  <span class="page">6 / 10</span>
  <a class="next" href="07-htmx.html">Siguiente →</a>
</div>
