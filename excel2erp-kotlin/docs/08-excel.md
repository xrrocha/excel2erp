---
layout: default
title: "El Aleph de las Celdas"
---

# El Aleph de las Celdas

<a href="img/08-aleph-cells.jpg" class="img-link float-right">
  <img src="img/08-aleph-cells.jpg" alt="El Aleph en una celda">
</a>

Regina suspira: *"Ugh, esta es la parte que siempre me da problemas. Lidiar con Excel es un laberinto. Tienes que verificar el tipo de cada celda: si es texto, si es número, si es fecha, ¡o peor, una fórmula!"*

---

## Funciones de Extensión

Dárico le enseña uno de los superpoderes de Kotlin:

*"Imagina que tienes un perro viejo, la clase `Cell` de FastExcel. Es un buen perro, pero no sabe hacer el truco que necesitas. Con las **funciones de extensión**, podemos 'enseñarle' trucos nuevos sin modificar al perro original"*.

```kotlin
// ¡El truco más importante!
fun Cell.toFormattedString(): String? = when (type) {
    CellType.STRING -> asString()
    CellType.NUMBER -> {
        val num = toBigDecimal()
        if (num.stripTrailingZeros().scale() <= 0) {
            num.toBigInteger().toString()
        } else {
            DefaultNumberFormatter.format(num.toDouble())
        }
    }
    CellType.BOOLEAN -> asBoolean().toString()
    CellType.FORMULA -> rawValue ?: text
    CellType.ERROR -> null
    CellType.EMPTY -> null
    else -> text
}
```

---

El código que Regina temía escribir — lleno de condicionales y manejo de errores — ha sido reemplazado por una función de extensión elegante, robusta y reutilizable.

Ahora, en el resto del código, puede simplemente llamar a `miCelda.toFormattedString()` y confiar en que obtendrá el valor correcto.

> **¡Han domado a la bestia de Excel!**

---

<a class="drill-down" href="code/workbook-kt.html">↓ Ver Workbook.kt completo</a>

---

<div class="nav">
  <a class="prev" href="07-htmx.html">← Anterior</a>
  <span class="page">8 / 10</span>
  <a class="next" href="09-functional.html">Siguiente →</a>
</div>

---

*Alusión a 'El Aleph' (1945) de Jorge Luis Borges, un punto que contiene todos los puntos del universo — como una celda que referencia todas las demás.*
