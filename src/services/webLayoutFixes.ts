const STYLE_ID='kitchen-ai-web-layout-fixes';

export function installWebLayoutFixes(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    /* React Native Web combines the catalog flyout's left:0 and right:0 atomic
       classes. For right-edge categories, right:0 must win so the product tray
       stays inside the browser viewport at increased browser/display zoom. */
    .r-zchlnj.r-1d2f490.r-1uacjwt.r-m7rbdw{left:auto!important;}
  `;
  document.head.appendChild(style);
}

installWebLayoutFixes();
