# Este script es un ejemplo del enfoque "aritmético".
# Nota la gran cantidad de código duplicado y valores "mágicos" (nombres de archivo,
# nombres de columna, RUCs de clientes) escritos directamente en el código.
# Para cada nuevo cliente, se copia y pega una función entera.

import pandas as pd
import numpy as np
from tkinter import *

# --- Estructuras de datos globales (a menudo un signo de diseño rígido) ---

# Se define un DataFrame vacío que se llenará repetidamente en cada función.
formatowms = pd.DataFrame(columns=['codigoEmpresarial', 'empresa',
'TipoOrden','fechaEmision', 'fechaEntrega',
'codigoBodOrigen', 'codigoBodDestino','numeroOrden', 'numeroViaje',
'ruta', 'codigoAcceso', 'puertaDespacho','pesoDeOrden', 'motivo',
'observacion', 'numeroOrdenInterna','codigoCliente',
'nombreCliente', 'ruc', 'direccionCliente','empresaOrdenInterna',
'linea', 'item', 'codigoArticulo', 'contenedor','unidadOrden',
'cantidadPedida', 'pesoBruto', 'pesoNeto'])

# --- Datos que se piden al usuario una sola vez ---
# Esto asume que todos los pedidos del día tienen la misma fecha.
fechaEmision = input('Ingrese Fecha de Emision (YYYYMMDD): ')
fechaEntrega = input('Ingrese fecha de Entrega (YYYYMMDD): ')
numeroOrden = input('Ingrese Numero de Orden: ')


# --- Función para el cliente "El Dorado" ---
def formatoElDorado():
    # Valores hardcodeados específicos para este cliente
    nomcliente = 'Mercados El Dorado'
    ruc = 'C800197225'

    # El nombre del archivo está escrito directamente en el código.
    # ¿Qué pasa si el usuario lo nombra diferente?
    df = pd.read_excel('data/el-dorado.xlsx', dtype={'Cod.':'str'})

    # Lógica de reemplazo específica, también hardcodeada.
    df['Cod.'] = df['Cod.'].replace({'77086': '701987570207', '47086': '707271908503'})

    # Rellenar el DataFrame de salida. Este bloque de código es casi idéntico
    # en todas las demás funciones. Un error aquí debe ser corregido en 5 lugares.
    formatowms['codigoArticulo'] = df['Cod.']
    formatowms['cantidadPedida'] = df['Cant.']
    formatowms['item'] = df['Descripción'] # Asumiendo una columna 'Descripción'
    formatowms['codigoCliente'] = ruc
    formatowms['nombreCliente'] = nomcliente
    formatowms['ruc'] = ruc
    formatowms['empresa'] = 'Rey Pepinito'
    formatowms['TipoOrden'] = 'NEX'
    formatowms['fechaEmision'] = fechaEmision
    formatowms['fechaEntrega'] = fechaEntrega
    formatowms['codigoBodOrigen'] = 'CD'
    formatowms['numeroOrden'] = numeroOrden
    formatowms['numeroOrdenInterna'] = numeroOrden
    formatowms['linea'] = formatowms.index + 1

    # El nombre del archivo de salida también es fijo.
    formatowms.to_excel('WMS_Pedido_ElDorado.xlsx', sheet_name='OrdenesPreparacion', index=False)
    print("Archivo para El Dorado generado exitosamente.")


# --- Función para el cliente "Cascabel" ---
def formatoCascabel():
    # Copiar y pegar la función anterior, cambiando los valores.
    nomcliente = 'Minimercados Cascabel'
    ruc = 'C1790014208001'

    df = pd.read_excel('data/cascabel.xlsx', dtype={'CODIGO':'str'})

    # Este bloque es idéntico al de la función formatoElDorado,
    # excepto por los nombres de las columnas ('CODIGO', 'CANT.').
    formatowms['codigoArticulo'] = df['CODIGO']
    formatowms['cantidadPedida'] = df['CANT.']
    formatowms['item'] = df['PRODUCTO'] # Asumiendo una columna 'PRODUCTO'
    formatowms['codigoCliente'] = ruc
    formatowms['nombreCliente'] = nomcliente
    formatowms['ruc'] = ruc
    formatowms['empresa'] = 'Rey Pepinito'
    formatowms['TipoOrden'] = 'NEX'
    formatowms['fechaEmision'] = fechaEmision
    formatowms['fechaEntrega'] = fechaEntrega
    formatowms['codigoBodOrigen'] = 'CD'
    formatowms['numeroOrden'] = numeroOrden
    formatowms['numeroOrdenInterna'] = numeroOrden
    formatowms['linea'] = formatowms.index + 1

    formatowms.to_excel('WMS_Pedido_Cascabel.xlsx', sheet_name='OrdenesPreparacion', index=False)
    print("Archivo para Cascabel generado exitosamente.")


# --- Función para el cliente "La Ñañita" ---
def formatoLaNanita():
    nomcliente = 'La Ñañita'
    ruc = 'C1701234567001'

    df = pd.read_excel('data/la-nanita.xlsx', dtype={'CÓDIGO':'str'})

    # De nuevo, el mismo bloque de código repetido.
    formatowms['codigoArticulo'] = df['CÓDIGO']
    formatowms['cantidadPedida'] = df['UNIDADES']
    formatowms['item'] = df['DESCRIPCION'] # Asumiendo una columna 'DESCRIPCION'
    formatowms['codigoCliente'] = ruc
    formatowms['nombreCliente'] = nomcliente
    formatowms['ruc'] = ruc
    formatowms['empresa'] = 'Rey Pepinito'
    formatowms['TipoOrden'] = 'NEX'
    formatowms['fechaEmision'] = fechaEmision
    formatowms['fechaEntrega'] = fechaEntrega
    formatowms['codigoBodOrigen'] = 'CD'
    formatowms['numeroOrden'] = numeroOrden
    formatowms['numeroOrdenInterna'] = numeroOrden
    formatowms['linea'] = formatowms.index + 1

    formatowms.to_excel('WMS_Pedido_LaNanita.xlsx', sheet_name='OrdenesPreparacion', index=False)
    print("Archivo para La Ñañita generado exitosamente.")


# --- Función para el cliente "La Pinta" ---
def formatoLaPinta():
    nomcliente = 'Tiendas La Pinta'
    ruc = 'C102345678'

    df = pd.read_excel('data/la-pinta.xlsx', dtype={'COD.':'str'})

    formatowms['codigoArticulo'] = df['COD.']
    formatowms['cantidadPedida'] = df['CANT.']
    formatowms['item'] = df['Articulo'] # Asumiendo una columna 'Articulo'
    formatowms['codigoCliente'] = ruc
    formatowms['nombreCliente'] = nomcliente
    formatowms['ruc'] = ruc
    formatowms['empresa'] = 'Rey Pepinito'
    formatowms['TipoOrden'] = 'NEX'
    formatowms['fechaEmision'] = fechaEmision
    formatowms['fechaEntrega'] = fechaEntrega
    formatowms['codigoBodOrigen'] = 'CD'
    formatowms['numeroOrden'] = numeroOrden
    formatowms['numeroOrdenInterna'] = numeroOrden
    formatowms['linea'] = formatowms.index + 1

    formatowms.to_excel('WMS_Pedido_LaPinta.xlsx', sheet_name='OrdenesPreparacion', index=False)
    print("Archivo para La Pinta generado exitosamente.")


# --- Función para el cliente "ÜberGroß" ---
def formatoUberGross():
    nomcliente = 'Supermercados ÜberGroß'
    ruc = 'CDE123456789'

    df = pd.read_excel('data/uber-gross.xlsx', dtype={'CÓDIGO':'str'})

    formatowms['codigoArticulo'] = df['CÓDIGO']
    formatowms['cantidadPedida'] = df['CANTIDAD']
    formatowms['item'] = df['ARTIKEL'] # Asumiendo una columna 'ARTIKEL'
    formatowms['codigoCliente'] = ruc
    formatowms['nombreCliente'] = nomcliente
    formatowms['ruc'] = ruc
    formatowms['empresa'] = 'Rey Pepinito'
    formatowms['TipoOrden'] = 'NEX'
    formatowms['fechaEmision'] = fechaEmision
    formatowms['fechaEntrega'] = fechaEntrega
    formatowms['codigoBodOrigen'] = 'CD'
    formatowms['numeroOrden'] = numeroOrden
    formatowms['numeroOrdenInterna'] = numeroOrden
    formatowms['linea'] = formatowms.index + 1

    formatowms.to_excel('WMS_Pedido_UberGross.xlsx', sheet_name='OrdenesPreparacion', index=False)
    print("Archivo para ÜberGroß generado exitosamente.")


# --- Interfaz de Usuario Simple ---
root = Tk()
root.title("FORMATO PEDIDOS 'REY PEPINITO'")
frame = Frame(root)
frame.pack(padx=10, pady=10)

Label(frame, text="Seleccione el cliente para procesar el pedido:").grid(row=0, column=0, columnspan=2, pady=10)

# Cada botón está atado a una función específica.
BotonElDorado = Button(frame, text="El Dorado", width=15, height=3, command=formatoElDorado).grid(row=1, column=0, padx=5, pady=5)
BotonCascabel = Button(frame, text="Cascabel", width=15, height=3, command=formatoCascabel).grid(row=1, column=1, padx=5, pady=5)
BotonLaNanita = Button(frame, text="La Ñañita", width=15, height=3, command=formatoLaNanita).grid(row=2, column=0, padx=5, pady=5)
BotonLaPinta = Button(frame, text="La Pinta", width=15, height=3, command=formatoLaPinta).grid(row=2, column=1, padx=5, pady=5)
BotonUberGross = Button(frame, text="ÜberGroß", width=15, height=3, command=formatoUberGross).grid(row=3, column=0, padx=5, pady=5)

root.mainloop()
