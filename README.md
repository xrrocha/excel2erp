# Excel to ERP

This project contains a metadata-driven tool to extract order data from an 
Excel workbook and generate an equivalent set of delimited files as expected 
by an ERP system. The tool is implemented in Kotlin on the JVM following a 
functional style and leveraging
[Javalin](https://javalin.io/),
[Apache POI](https://poi.apache.org/),
Yaml (w/[Jackson](https://github.com/FasterXML/jackson-dataformats-text/tree/2.x/yaml))
and [HTMX](https://htmx.org/).

To run the demo (requires Java 11+), execute the `demo/run.sh` shell script. 
Under Windows execute the `demo/run.bat` batch file. Enjoy!

An illustrating document (in Spanish, oh my!)
is located at `demo/algebra-vs-aritmetica.html` in this repo
and is also available online,
[for your perusal pleasure](https://rrocha.me/vimeworks/algebra-vs-aritmetica.html).
