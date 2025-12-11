---
layout: default
title: "Análisis de los Enfoques"
---

# Análisis de los Enfoques

<a href="img/04-coffee-machine-architect.jpg" class="img-link">
  <img src="img/04-coffee-machine-architect.jpg" alt="Análisis de los Enfoques">
</a>

| Aspecto | Aritmética | Álgebra |
|---------|-----------|---------|
| **Añadir cliente** | Escribir código nuevo (copiar y pegar) | Añadir datos al YAML |
| **Repetición** | Extrema. Un error se corrige en muchos lugares | Cero. Lógica escrita una sola vez |
| **Configuración** | Enterrada en el código | Centralizada y clara |
| **Mantenimiento** | Difícil y arriesgado | Simple y seguro |

---

## De "Máquina de Café" a Intérprete

Hay un viejo chiste: *"un programador es un dispositivo que convierte café en código"*.

Quizás deberíamos decir: **un programador convierte metadatos en código**.

Aquí los senderos se bifurcan:

### El Expansor de Plantillas

Recibimos los metadatos de un caso (el Excel del cliente A) y aplicamos una receta mental para generar código que lo resuelva. Cuando llega el cliente B, aplicamos la misma receta con variaciones.

Esto es lo que Regina hizo. Es una reacción natural, pero nos convierte en simples ejecutores de una plantilla mental.

### El Intérprete de Metadatos

En lugar de generar código nuevo para cada caso, construimos un sistema que *lee* los metadatos en tiempo de ejecución y actúa en consecuencia.

No escribimos código para el cliente A o B. Escribimos un solo "motor" que entiende el *lenguaje* en el que se describen los clientes.

---

> Este es el salto conceptual: el valor no está en expandir la misma plantilla una y otra vez, sino en diseñar un *intérprete*.

Es la diferencia entre escribir un script y diseñar un sistema.

---

<div class="nav">
  <a class="prev" href="03-contrast.html">← Anterior</a>
  <span class="page">4 / 10</span>
  <a class="next" href="05-model.html">Siguiente →</a>
</div>
