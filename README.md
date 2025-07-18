# Excel to ERP

This project contains a metadata-driven tool to extract order data from an 
Excel workbook and generate an equivalent set of delimited files as expected 
by an ERP system. The tool is implemented in Kotlin on the JVM following a 
functional style and leveraging
[Javalin](https://javalin.io/),
[Apache POI](https://poi.apache.org/),
Yaml (w/[Jackson](https://github.com/FasterXML/jackson-dataformats-text/tree/2.x/yaml))
and [HTMX](https://htmx.org/).

To run the beast, execute the `dist/run.sh` shell script and enjoy!

An illustrating document (in Spanish, oh my!) is available
[for your perusal pleasure](dist/algebra-vs-aritmetica.html).