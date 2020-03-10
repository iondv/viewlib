Эта страница на [English](/README.md)

# IONDV. Viewlib

**Viewlib** - is an IONDV. Framework module. It allows you to apply additional functionality to system objects, expanding the capabilities of applications implemented on IONDV.Framework.

### IONDV. Framework in brief

**IONDV. Framework** - is a node.js open source framework for developing accounting applications
or microservices based on metadata and individual modules. Framework is a part of 
instrumental digital platform to create enterprise 
(ERP) apps. This platform consists of the following open-source components: the [IONDV. Framework](https://github.com/iondv/framework), the
[modules](https://github.com/topics/iondv-module) и ready-made applications expanding it
functionality, visual development environment [Studio](https://github.com/iondv/studio) to create metadata for the app.

* For more details, see [IONDV. Framework site](https://iondv.com). 

* Documentation is available in the [Github repository](https://github.com/iondv/framework/blob/master/docs/en/index.md).

## Description

**IONDV. Viewlib** - is an additional application that contains a library with templates that allow you to display the attributes of the main application in various representations. IONDV. Viewlib is used only as an addition to the main application implemented on IONDV. Framework

To apply the functionality of the application, you must specify the template name of the IONDV. Viewlib. Set the link to the attribute on the view form.

## Module features

- [x] Отображение атрибута типа "Файл" на форме объекта системы в виде коллекции.
- [x] Представление атрибута типа "Файл" на форме как ресурса для совместного использования.
- [x] Отображение атрибута типа "Целое" в виде динамической шкалы числовых значений.
- [x] Представление атрибута типа "Коллекция" в виде комментария.

## Connecting IONDV. Viewlib

Для применения функционала приложения IONDV. Viewlib необходимо клонировать его в папку `applications`, рядом с основным приложением для объектов которого будет настраиваться функционал. Клонируем приложение в папку назначения командой:
```
git clone https://github.com/iondv/viewlib.git
```
Далее, в мете представления, для атрибута нужно указать наименование шаблона в свойстве `"options"`:
```
"options": {
    "template": "name"
}
```
### Description of module features:

#### Представление атрибута типа "Коллекция" в виде комментария

Для обмена сообщениями между пользователями на форме объекта системы есть возможность подключить шаблон `"comments"`. Шаблон доступен только для атрибута с типом "Коллекция" на форме представления. Основой атрибута с представлением "Комментарий" будут атрибуты из класса, указанного в свойстве `"itemsClass"`. [Подробнее об атрибуте типа "Коллекция"](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_class/atr_itemclass_backcoll.md). 

Подключение шаблона `"comments"`:

```
"options": {
    "template": "comments",
    "comments": {
        "textProperty": "descript",
        "userProperty": "owner",
        "parentProperty": "answlink",
        "photoProperty": "owner_ref.foto.link",
        "dateProperty": "date"
    }
}
```
* `"descript"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит текст комментария пользователя.
* `"owner"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит данные о пользователе, создавшем комментарий.
* `"answlink"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит ответы на комментарий (обратная ссылка). Указаны в иерархическом порядке от комментария.
* `"owner_ref.foto.link"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит фото пользователя.
* `"date"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит дату отправки комментария.

#### Представление атрибута типа "Файл" в виде коллекции

При добавлении файлов на форму объекта системы - они отображаются в таблице, колонки которой являются атрибутами класса, указанного в свойстве `"itemsClass"` и предоставляют информацию о файле.

Подключение шаблона `"file-collection"`:
```
"options": {
    "template": "file-collection",
    "map": {
        "file": "file",
        "fileName": "name"
    },
    "maxSize": 20971520,
    "share": true
}
```
"file"
"name"
"maxSize" - максимальное значение 
"share" - логическое значение, отображающее возможность совместного использования файла.

* `"file"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит ссылку на класс файлов.
* `"name"` - атрибут класса, указанного для свойства `"itemsClass"`, который содержит наименование добавленного файла.
* `"maxSize"` - максимальный размер добавляемых файлов (Мб). 
* `"share"` - логическое значение, отображающее возможность совместного использования файла.

#### Представление атрибута типа "Целое" в виде динамической шкалы числовых значений

Одним из способов задать числовое значение для атрибута на форме является применение шкалы числовых значений с бегунком. Для настройки представления атрибута типа "Целое" в виде такой шкалы необходимо применить шаблон `"slider"`.

Подключение шаблона `"slider"`:
```
"options": {
    "template": "slider",
    "slider": {
        "min": 0,
        "size": 250,
        "value": 0,
        "max": 100,
        "step": 5,
        "vertical": false,
        "popup": "Текущее значение: #value#",
        "skin": "material"
    }
}
```
* `"min"` - минимальное числовое значение на шкале.
* `"size"`: - размер шкалы, стандарное значение _250_.
* `"value"` - значение по умолчанию на шкале.
* `"max"` - максимальное числовое значение на шкале.
* `"step"` - шаг между числовыми значениями на шкале при передвижении бегунка.
* `"vertical"` - логическое значение, указывающее на вертикальное расположение шкалы.
* `"popup"` - текст, отображаемый при наведении на бегунок, где _#value#_ - текущее значение атрибута.
* `"skin"`: - тема, по умолчанию значение _"material"_.
--------------------------------------------------------------------------  


 #### [Licence](/LICENSE) &ensp;  [Contact us](https://iondv.com) &ensp;  [English](/README.md)   &ensp; [FAQs](/faqs.md)          

<div><img src="https://mc.iondv.com/watch/local/docs/app/viewlib" style="position:absolute; left:-9999px;" height=1 width=1 alt="iondv metrics"></div>

--------------------------------------------------------------------------  

Copyright (c) 2018 **LLC "ION DV"**.  
All rights reserved. 

