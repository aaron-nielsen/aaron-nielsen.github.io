"""Gaussian single-smooth GAM: cubic smoothing spline, GCV penalty selection.
Fit actual measurements only; birthday zero is a separate visual reference.
Run after prepare-data.py whenever measurements change.
"""
import json
from pathlib import Path
from datetime import date, timedelta
import numpy as np
from scipy.interpolate import make_smoothing_spline
root=Path(__file__).resolve().parent
rows=json.loads((root/'weights.json').read_text())
result={}
for name in ['Cate','Peach','Josie','Ellie','Abbie','Jackie','Martha','Dolley','Zelda','Cleo']:
    records=[r for r in rows if name in r]
    start=date.fromisoformat(records[0]['date'])
    x=np.array([(date.fromisoformat(r['date'])-start).days for r in records],dtype=float)/365.25
    y=np.array([r[name] for r in records])
    fit=make_smoothing_spline(x,y)
    days=np.unique(np.linspace(0,round(x[-1]*365.25),241).round().astype(int))
    values=fit(days/365.25)
    assert np.isfinite(values).all() and (values>=0).all()
    result[name]=[{'date':(start+timedelta(days=int(d))).isoformat(),'weight':round(float(w),4)} for d,w in zip(days,values)]
(root/'smooth-weights.json').write_text(json.dumps(result,separators=(',',':')))
print('Fitted 10 GCV cubic smoothing splines to recorded weights.')
