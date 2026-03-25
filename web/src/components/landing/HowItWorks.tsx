const steps = [
  { n: '01', title: 'Recolectamos datos', desc: 'Scraper Python analiza miles de avisos en portales chilenos cada día.' },
  { n: '02', title: 'Calculamos valor justo', desc: 'XGBoost compara cada propiedad con el mercado real de su comuna.' },
  { n: '03', title: 'Te alertamos', desc: 'Score >80 → email automático con todos los detalles al instante.' },
]

export function HowItWorks() {
  return (
    <section id='como-funciona' className='px-6 py-20 bg-slate-900/40 border-y border-white/[0.06]'>
      <div className='max-w-5xl mx-auto'>
        <p className='text-center text-xs font-bold uppercase tracking-widest text-emerald-500 mb-3'>Proceso</p>
        <h2 className='text-center text-4xl font-extrabold mb-4'>Cómo funciona</h2>
        <p className='text-center text-slate-400 max-w-md mx-auto mb-16'>Tres pasos automatizados, una decisión más inteligente.</p>
        <div className='relative flex flex-col md:flex-row gap-8'>
          <div className='hidden md:block absolute top-6 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-emerald-600/40 to-transparent' />
          {steps.map(s => (
            <div key={s.n} className='flex-1 text-center'>
              <div className='w-14 h-14 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 relative z-10 font-bold text-emerald-300 text-lg'>
                {s.n}
              </div>
              <h3 className='font-bold mb-2'>{s.title}</h3>
              <p className='text-sm text-slate-400 leading-relaxed'>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
