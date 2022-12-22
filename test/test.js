const { prerender } = require('../index');
const fs = require('fs');

prerender(config = {
  seo: {
    title: "global title",
    keywords: ["keyword1", "keyword2", "keyword3"],
    description: "Your website global description",
    meta: [
      { name: 'metaname1', content: 'meta content1' },
      { name: 'metaname2', content: 'meta content2' },
    ]
  },
  pages: ['/', '/nopre', '/dir/indir?param=value', 
    {
      url: '/pre/abc',
      output: '/pre',
      seo: {
        title: "Pre Title",
        keywords: ["Pre Render", "Pre-render"],
        description: "Pre page is a test page",
        meta: [
          { name: 'pre', content: 'pre-render' },
        ]
      }
    }
  ],
})