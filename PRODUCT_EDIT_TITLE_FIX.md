# Product Edit — Preserve Existing Title

عند فتح نافذة تعديل منتج، إذا كان `name_ar` أو `name_en` غير موجود بينما يوجد `product_name`، يتم استخدام `product_name` تلقائيًا كعنوان احتياطي.

وعند الحفظ، إذا كانت حقول الأسماء فارغة، يتم الاحتفاظ بعنوان `product_name` القديم بدل إجبار المستخدم على كتابته مرة أخرى.

التعديل موجود في:
`src/components/ProductFormDialog.tsx`
