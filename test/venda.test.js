'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('página de vendas mantém checkout, contato e navegação utilizáveis',()=>{
 const dom=new JSDOM(fs.readFileSync('public/venda.html','utf8'),{url:'https://mapado-guardiao.vercel.app/venda'});
 try{
  const d=dom.window.document,links=[...d.querySelectorAll('[data-checkout]')];
  assert.ok(links.length>=3);
  for(const link of links)assert.equal(link.href,'https://pay.kiwify.com.br/vT6ZxZd');
  for(const link of d.querySelectorAll('a[href^="#"]'))assert.ok(d.getElementById(link.getAttribute('href').slice(1)),'Âncora de navegação sem destino.');
  assert.equal(d.querySelector('a[href^="mailto:"]').href,'mailto:contato.energystudio@gmail.com');
  for(const img of d.images)assert.ok(img.src&&!img.src.includes('placeholder')&&img.alt);
  assert.match(d.body.textContent,/8x de R\$ 5,38/);assert.match(d.body.textContent,/R\$ 37,00/);
 }finally{dom.window.close();}
});
