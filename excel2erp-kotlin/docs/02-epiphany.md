---
layout: default
title: "La Epifanía"
---

# La Epifanía

<a href="img/02-epiphany.jpg" class="img-link">
  <img src="img/02-epiphany.jpg" alt="La Epifanía">
</a>

Regina se da cuenta de que las cosas han ido demasiado lejos. El script se ha vuelto tan complejo y frágil que "nadie quiere tocarlo".

Peor aún, los usuarios de ventas tienen que completar datos a mano antes de ejecutarlo, lo que provoca errores y frustración. La "solución rápida" se ha convertido en el problema de todos.

---

Una tarde, mientras mira el código enredado, tiene una revelación:

> *"¿Y si dejo de escribir código para cada cliente? ¿Y si, en lugar de eso, pudiera simplemente **describir** lo que necesito de cada archivo Excel?"*

No piensa en el código para implementarlo todavía. Solo se enfoca en la pregunta: si Dios fuera misericordioso y me concediera este Santo Grial, **¿cómo se vería esa descripción?**

---

Saca un editor de texto y empieza a imaginar.

Elige **YAML** porque es limpio y legible para los humanos. Su visión empieza a tomar forma, y el resultado es una descripción elegante del problema:

```yaml
sources:
  - name: el-dorado
    description: Mercados El Dorado
    defaultValues:
      CardCode: C800197225
    header:
      - name: NumAtCard
        locator: E2
    detail:
      locator: A8
      properties:
        - name: ItemCode
          locator: Cod.
        - name: Quantity
          locator: Cant.
```

El código ya no dice *cómo* leer el Excel. Dice *qué* leer. El "motor" (que aún no existe) se encargará del cómo.

---

<div class="nav">
  <a class="prev" href="01-genesis.html">← Anterior</a>
  <span class="page">2 / 10</span>
  <a class="next" href="03-contrast.html">Siguiente →</a>
</div>
