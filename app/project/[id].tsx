import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSheetData } from '../../hooks/useSheetData';
import { useTheme } from '../../hooks/useTheme';

const num = (v: any) => parseFloat(String(v ?? 0).replace(/\s/g, '').replace(',', '.')) || 0;
const fmtM = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${Math.round(v)}`;
const fmtP = (v: number) => `${Math.round(v)}%`;
const DC = ['#7fb0d4','#e8a667','#5fa97f','#d6a84f','#d97a5c','#9b7fd4','#4fb8a8'];
const isJunk = (s: string) => /^[\d\s]+$/.test(s.trim());

function ArcGauge({ pct, color, size = 110 }: { pct: number; color: string; size?: number }) {
  const { D } = useTheme();
  const Svg = require('react-native-svg').default;
  const { Path, Defs, LinearGradient, Stop, Text: ST } = require('react-native-svg');
  const cx = size/2, cy = size*0.52, r = size*0.38, sw = size*0.12;
  const p = Math.min(1, Math.max(0, pct/100));
  const toR = (d: number) => d * Math.PI / 180;
  const apt = (d: number) => ({ x: cx + r*Math.cos(toR(d)), y: cy + r*Math.sin(toR(d)) });
  const arc = (f: number, t: number) => {
    const s = apt(f), e = apt(t), lg = t-f > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${r},${r} 0 ${lg} 1 ${e.x},${e.y}`;
  };
  const endD = 180 + 180*p;
  const gid = `gg-${Math.round(size)}-${Math.round(pct)}`;
  const h = size * 0.66;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: h }}>
      <Svg width={size} height={h} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={D.yellow} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path d={arc(180, 360)} fill="none" stroke={D.border} strokeWidth={sw} strokeLinecap="round" />
        {p > 0.001 && <Path d={arc(180, endD)} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} strokeLinecap="round" />}
      </Svg>
      <Text style={{ fontSize: size*0.20, fontWeight: '900', color: D.text, marginTop: h * 0.3 }}>{Math.round(pct)}%</Text>
    </View>
  );
}

function EvmChart({ pv, ev, ac, w, h = 150 }: { pv: number[]; ev: number[]; ac: number[]; w: number; h?: number }) {
  const { D } = useTheme();
  const Svg = require('react-native-svg').default;
  const { Path, Line, Text: ST, Defs, LinearGradient, Stop } = require('react-native-svg');
  if (pv.length < 2) return null;
  const all = [...pv, ...ev, ...ac];
  const mn = Math.min(...all), mx = Math.max(...all), range = mx - mn || 1;
  const padL = 46, padR = 12, padT = 10, padB = 22;
  const cw = w - padL - padR, ch = h - padT - padB;
  const toX = (i: number, len: number) => padL + (i / (len - 1)) * cw;
  const toY = (v: number) => padT + (1 - (v - mn) / range) * ch;
  const makePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i, vals.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const yTicks = [mn, mn + range * 0.5, mx].map(v =>
    v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${Math.round(v)}`);
  return (
    <Svg width={w} height={h}>
      {[0, 0.5, 1].map((f, i) => (
        <Line key={i} x1={padL} y1={padT + (1-f)*ch} x2={w-padR} y2={padT + (1-f)*ch} stroke={D.border} strokeWidth={0.7} />
      ))}
      {yTicks.map((t, i) => (
        <ST key={i} x={padL-4} y={padT + (1-i*0.5)*ch+4} fontSize={9} fill={D.muted} textAnchor="end">{t}</ST>
      ))}
      <Defs>
        <LinearGradient id="evG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={D.green} stopOpacity="0.18" />
          <Stop offset="1" stopColor={D.green} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={`${makePath(ev)} L${toX(ev.length-1,ev.length)},${padT+ch} L${padL},${padT+ch} Z`} fill="url(#evG)" />
      <Path d={makePath(pv)} fill="none" stroke={D.blue}  strokeWidth={2.2} strokeDasharray="6,3" strokeLinejoin="round" strokeLinecap="round" />
      <Path d={makePath(ev)} fill="none" stroke={D.green} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Path d={makePath(ac)} fill="none" stroke={D.red}   strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {[{vals:pv,c:D.blue},{vals:ev,c:D.green},{vals:ac,c:D.red}].map((s,idx) => {
        const last = s.vals[s.vals.length-1];
        return <Path key={idx} d={`M${toX(s.vals.length-1,s.vals.length)},${toY(last)} m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0`} fill={s.c} />;
      })}
    </Svg>
  );
}

function Spark({ values, color, h = 50, w = 120 }: { values: number[]; color: string; h?: number; w?: number }) {
  const { D } = useTheme();
  if (values.length < 2) return <View style={{ height: h }} />;
  const Svg = require('react-native-svg').default;
  const { Path, Line } = require('react-native-svg');
  const mn = Math.min(...values), mx = Math.max(...values), range = mx - mn || 1;
  const pad = 4, ew = (w - pad*2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i*ew, pad + (1-(v-mn)/range)*(h-pad*2)] as [number,number]);
  const d = pts.map((p,i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const refY = pad + (1-(1-mn)/range)*(h-pad*2);
  return (
    <Svg width={w} height={h}>
      {refY > pad && refY < h-pad && <Line x1={pad} y1={refY} x2={w-pad} y2={refY} stroke={D.muted} strokeWidth={0.7} strokeDasharray="3,2" />}
      <Path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { D } = useTheme();
  return (
    <View style={[{ backgroundColor: D.card, borderRadius: 14, borderWidth: 1, borderColor: D.border, padding: 14 }, style]}>
      {children}
    </View>
  );
}

function SH({ label, color }: { label: string; color: string }) {
  const { D } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <View style={{ width: 3, height: 13, backgroundColor: color, borderRadius: 2 }} />
      <Text style={{ fontSize: 10, fontWeight: '800', color: D.sub, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function ShowMore({ expanded, onToggle, count }: { expanded: boolean; onToggle: () => void; count: number }) {
  const { D } = useTheme();
  return (
    <TouchableOpacity onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        marginTop: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: D.border }}>
      <Text style={{ fontSize: 11, color: D.sub, fontWeight: '600' }}>
        {expanded ? 'Show less' : `Show ${count} more`}
      </Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={D.sub} />
    </TouchableOpacity>
  );
}

export default function ProjectScreen() {
  const { id, sheetId } = useLocalSearchParams<{ id: string; sheetId?: string }>();
  const { D } = useTheme();
  const { data, loading, error, refresh } = useSheetData(sheetId);
  const { width } = useWindowDimensions();
  const col2 = (width - 14*2 - 10) / 2;

  const [showAllPhases, setShowAllPhases] = useState(false);
  const [showAllCats,   setShowAllCats]   = useState(false);

  if (loading) return (
    <View style={{ flex:1, backgroundColor:D.bg, alignItems:'center', justifyContent:'center', gap:12 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={D.blue} size="large" />
      <Text style={{ color:D.muted, fontSize:13, letterSpacing:2 }}>LOADING...</Text>
    </View>
  );

  if (error || !data) return (
    <View style={{ flex:1, backgroundColor:D.bg, alignItems:'center', justifyContent:'center', gap:12 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color:D.red, fontSize:14 }}>⚠ {error ?? 'No data'}</Text>
      <TouchableOpacity onPress={refresh} style={{ paddingHorizontal:20, paddingVertical:10, backgroundColor:D.blue, borderRadius:8 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const p = data.projects.find(pr => pr.project_id === id) ?? data.projects[0];
  if (!p) return (
    <View style={{ flex:1, backgroundColor:D.bg, alignItems:'center', justifyContent:'center' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color:D.muted }}>Project not found</Text>
    </View>
  );

  const prog = num(p.progress_pct);
  const cpi  = num(p.cpi), spi = num(p.spi);
  const budget = num(p.total_budget_usd), spent = num(p.spent_to_date_usd);
  const iCol = (v: number) => v >= 1 ? D.green : D.red;
  const sCol = (s: string) => s === 'On Track' ? D.green : s === 'Delayed' ? D.red : D.yellow;
  const spentPct = budget > 0 ? Math.round((spent/budget)*100) : 0;
  const statusColor = sCol(p.status);

  const schedule   = data.schedule.filter(m => m.project_id === id);
  const allPhases  = [...new Set(schedule.map(m => m.phase))].filter(ph => ph && !isJunk(ph)) as string[];
  const PLIMIT     = 5;
  const visPhases  = showAllPhases ? allPhases : allPhases.slice(0, PLIMIT);
  const msDone = schedule.filter(m => m.status === 'Done').length;
  const msInP  = schedule.filter(m => m.status === 'In Progress').length;
  const msDel  = schedule.filter(m => m.status === 'Delayed').length;

  const budgetRows = data.budget.filter(b => b.project_id === id);
  const catMap: Record<string, { pl: number; ac: number }> = {};
  budgetRows.forEach(b => {
    if (isJunk(b.category)) return;
    if (!catMap[b.category]) catMap[b.category] = { pl:0, ac:0 };
    catMap[b.category].pl += num(b.planned_usd);
    catMap[b.category].ac += num(b.actual_usd);
  });
  const allCats  = Object.entries(catMap).map(([cat,v]) => ({ cat, ...v })).sort((a,b) => b.ac - a.ac);
  const CLIMIT   = 4;
  const visCats  = showAllCats ? allCats : allCats.slice(0, CLIMIT);

  const evm       = data.evm.filter(e => e.project_id === id);
  const latestEvm = evm[evm.length - 1];
  const cpiS = evm.map(e => num(e.cpi));
  const spiS = evm.map(e => num(e.spi));
  const pvS  = evm.map(e => num(e.pv_usd));
  const evS  = evm.map(e => num(e.ev_usd));
  const acS  = evm.map(e => num(e.ac_usd));

  return (
    <View style={{ flex:1, backgroundColor:D.bg }}>
      <Stack.Screen options={{
        headerShown: true, title: p.project_name,
        headerStyle: { backgroundColor: D.panel },
        headerTitleStyle: { color:D.text, fontWeight:'800', fontSize:15 },
        headerTintColor: D.text, headerShadowVisible: false,
        headerBackTitle: ' ',
      }} />

      <ScrollView contentContainerStyle={{ padding:14, gap:10, paddingBottom:40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>

        {/* HERO */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <View style={{ paddingHorizontal:9, paddingVertical:4, backgroundColor:statusColor+'22',
              borderRadius:6, borderWidth:1, borderColor:statusColor }}>
              <Text style={{ fontSize:10, color:statusColor, fontWeight:'800', letterSpacing:1 }}>{p.status.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize:11, color:D.muted }}>{p.location}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <ArcGauge pct={prog} color={D.blue} size={120} />
            <View style={{ flex:1, gap:8 }}>
              <View style={{ flexDirection:'row', gap:8 }}>
                <View style={{ flex:1, backgroundColor:D.bg, borderRadius:10, padding:10, borderWidth:1, borderColor:D.border }}>
                  <Text style={{ fontSize:9, color:D.muted, letterSpacing:1 }}>BUDGET</Text>
                  <Text style={{ fontSize:15, fontWeight:'900', color:D.text }}>{fmtM(budget)}</Text>
                </View>
                <View style={{ flex:1, backgroundColor:D.bg, borderRadius:10, padding:10, borderWidth:1, borderColor:D.border }}>
                  <Text style={{ fontSize:9, color:D.muted, letterSpacing:1 }}>SPENT</Text>
                  <Text style={{ fontSize:15, fontWeight:'900', color:spentPct>100?D.red:D.text }}>{fmtM(spent)}</Text>
                  <Text style={{ fontSize:9, color:D.sub }}>{spentPct}% used</Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', gap:8 }}>
                <View style={{ flex:1, backgroundColor:cpi>=1?D.greenDim:D.redDim, borderRadius:10, padding:10, borderWidth:1, borderColor:cpi>=1?D.green:D.red }}>
                  <Text style={{ fontSize:9, color:D.muted, letterSpacing:1 }}>CPI</Text>
                  <Text style={{ fontSize:17, fontWeight:'900', color:iCol(cpi) }}>{cpi.toFixed(2)}</Text>
                  <Text style={{ fontSize:9, color:iCol(cpi) }}>{cpi>=1?'On budget':'Over'}</Text>
                </View>
                <View style={{ flex:1, backgroundColor:spi>=1?D.greenDim:D.redDim, borderRadius:10, padding:10, borderWidth:1, borderColor:spi>=1?D.green:D.red }}>
                  <Text style={{ fontSize:9, color:D.muted, letterSpacing:1 }}>SPI</Text>
                  <Text style={{ fontSize:17, fontWeight:'900', color:iCol(spi) }}>{spi.toFixed(2)}</Text>
                  <Text style={{ fontSize:9, color:iCol(spi) }}>{spi>=1?'On sched.':'Behind'}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={{ marginTop:14, gap:5 }}>
            <View style={{ height:6, backgroundColor:D.bg, borderRadius:3, overflow:'hidden' }}>
              <View style={{ height:6, width:`${Math.min(spentPct,100)}%`, backgroundColor:spentPct>100?D.red:D.blue, borderRadius:3 }} />
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:9, color:D.muted }}>Spent {fmtM(spent)}</Text>
              <Text style={{ fontSize:9, color:spentPct>100?D.red:D.green, fontWeight:'700' }}>{spentPct}% used</Text>
              <Text style={{ fontSize:9, color:D.muted }}>Total {fmtM(budget)}</Text>
            </View>
          </View>
        </Card>

        {/* MILESTONES */}
        <Card>
          <SH label="Milestones" color={D.cyan} />
          <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
            {[{l:'DONE',v:msDone,c:D.green},{l:'IN PROG',v:msInP,c:D.blue},{l:'DELAYED',v:msDel,c:msDel>0?D.red:D.muted}].map(item=>(
              <View key={item.l} style={{ flex:1, alignItems:'center', backgroundColor:item.c+'18',
                borderWidth:1, borderColor:item.c+'44', borderRadius:10, paddingVertical:10 }}>
                <Text style={{ fontSize:8, color:D.muted, letterSpacing:1 }}>{item.l}</Text>
                <Text style={{ fontSize:22, fontWeight:'900', color:item.c }}>{item.v}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap:8 }}>
            {visPhases.map(phase => {
              const phMs   = schedule.filter(m => m.phase === phase);
              const phDone = phMs.filter(m => m.status === 'Done').length;
              const phPct  = phMs.length > 0 ? (phDone/phMs.length)*100 : 0;
              const phCol  = phPct===100?D.green:phMs.some(m=>m.status==='Delayed')?D.red:phPct>0?D.blue:D.muted;
              return (
                <View key={phase} style={{ gap:4 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={{ fontSize:12, color:D.text }}>{phase}</Text>
                    <Text style={{ fontSize:12, color:phCol, fontWeight:'700' }}>{fmtP(phPct)}</Text>
                  </View>
                  <View style={{ height:7, backgroundColor:D.bg, borderRadius:4 }}>
                    {phPct>0 && <View style={{ height:7, width:`${phPct}%`, backgroundColor:phCol, borderRadius:4 }} />}
                  </View>
                </View>
              );
            })}
          </View>
          {allPhases.length > PLIMIT && (
            <ShowMore expanded={showAllPhases} onToggle={() => setShowAllPhases(v=>!v)} count={allPhases.length - PLIMIT} />
          )}
          <View style={{ marginTop:12, backgroundColor:spi>=1?D.greenDim:D.redDim, borderWidth:1,
            borderColor:spi>=1?D.green:D.red, borderRadius:8, padding:10,
            flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ fontSize:10, color:D.sub, letterSpacing:1 }}>SCHEDULE SPI</Text>
            <Text style={{ fontSize:15, fontWeight:'900', color:iCol(spi) }}>{spi.toFixed(2)} {spi>=1?'✓':'⚠'}</Text>
          </View>
        </Card>

        {/* EVM */}
        {evm.length >= 2 && (<>
          {latestEvm && (
            <View style={{ flexDirection:'row', gap:8 }}>
              {[
                {l:'EAC',v:fmtM(num(latestEvm.eac_usd)),c:num(latestEvm.eac_usd)>num(latestEvm.bac_usd)?D.red:D.green},
                {l:'CV', v:`${num(latestEvm.cv_usd)>=0?'+':''}${fmtM(num(latestEvm.cv_usd))}`,c:num(latestEvm.cv_usd)>=0?D.green:D.red},
                {l:'SV', v:`${num(latestEvm.sv_usd)>=0?'+':''}${fmtM(num(latestEvm.sv_usd))}`,c:num(latestEvm.sv_usd)>=0?D.green:D.red},
              ].map(item=>(
                <Card key={item.l} style={{ flex:1, padding:12, alignItems:'center', gap:3 }}>
                  <Text style={{ fontSize:9, color:D.muted, letterSpacing:1 }}>{item.l}</Text>
                  <Text style={{ fontSize:14, fontWeight:'900', color:item.c }}>{item.v}</Text>
                </Card>
              ))}
            </View>
          )}
          <View style={{ flexDirection:'row', gap:10 }}>
            <Card style={{ flex:1, padding:12 }}>
              <Text style={{ fontSize:9, color:D.muted, letterSpacing:1, marginBottom:2 }}>CPI TREND</Text>
              <Text style={{ fontSize:20, fontWeight:'900', color:iCol(cpi), marginBottom:6 }}>{cpi.toFixed(2)}</Text>
              <Spark values={cpiS} color={iCol(cpi)} h={46} w={col2-24} />
            </Card>
            <Card style={{ flex:1, padding:12 }}>
              <Text style={{ fontSize:9, color:D.muted, letterSpacing:1, marginBottom:2 }}>SPI TREND</Text>
              <Text style={{ fontSize:20, fontWeight:'900', color:iCol(spi), marginBottom:6 }}>{spi.toFixed(2)}</Text>
              <Spark values={spiS} color={iCol(spi)} h={46} w={col2-24} />
            </Card>
          </View>
          <Card>
            <SH label="EVM S-Curve" color={D.blue} />
            <EvmChart pv={pvS} ev={evS} ac={acS} w={width-14*2-28} h={150} />
            <View style={{ flexDirection:'row', gap:14, marginTop:10 }}>
              {[{l:'Planned Value',c:D.blue,dash:true},{l:'Earned Value',c:D.green,dash:false},{l:'Actual Cost',c:D.red,dash:false}].map(it=>(
                <View key={it.l} style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                  <View style={{ width:14, height:2.5, backgroundColor:it.c, borderRadius:2, opacity:it.dash?0.6:1 }} />
                  <Text style={{ fontSize:9, color:D.muted }}>{it.l}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>)}

        {/* BUDGET BY CATEGORY */}
        {allCats.length > 0 && (
          <Card>
            <SH label="Budget by Category" color={D.orange} />
            <View style={{ gap:10 }}>
              {visCats.map((c,i) => {
                const max = Math.max(c.pl, c.ac, 1), over = c.ac > c.pl;
                const pct = c.pl > 0 ? Math.round((c.ac/c.pl)*100) : 0;
                return (
                  <View key={c.cat} style={{ gap:4 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6, flex:1 }}>
                        <View style={{ width:8, height:8, borderRadius:4, backgroundColor:DC[i%7] }} />
                        <Text style={{ fontSize:12, color:D.text, flex:1 }} numberOfLines={1}>{c.cat}</Text>
                      </View>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                        <Text style={{ fontSize:11, color:D.muted }}>{fmtM(c.ac)}</Text>
                        <Text style={{ fontSize:11, fontWeight:'800', color:over?D.red:D.green, minWidth:36, textAlign:'right' }}>{pct}%</Text>
                      </View>
                    </View>
                    <View style={{ height:7, backgroundColor:D.bg, borderRadius:4, overflow:'hidden' }}>
                      <View style={{ position:'absolute', top:0, left:0, height:7, width:`${(c.pl/max)*100}%`, backgroundColor:DC[i%7], opacity:0.25, borderRadius:4 }} />
                      <View style={{ position:'absolute', top:0, left:0, height:7, width:`${Math.min((c.ac/max)*100,100)}%`, backgroundColor:over?D.red:DC[i%7], borderRadius:4 }} />
                    </View>
                  </View>
                );
              })}
            </View>
            {allCats.length > CLIMIT && (
              <ShowMore expanded={showAllCats} onToggle={() => setShowAllCats(v=>!v)} count={allCats.length - CLIMIT} />
            )}
            <View style={{ flexDirection:'row', gap:12, marginTop:10 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:10, height:6, backgroundColor:D.blue, opacity:0.3, borderRadius:2 }} />
                <Text style={{ fontSize:9, color:D.muted }}>Planned</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:10, height:6, backgroundColor:D.blue, borderRadius:2 }} />
                <Text style={{ fontSize:9, color:D.muted }}>Actual</Text>
              </View>
            </View>
          </Card>
        )}

      </ScrollView>
    </View>
  );
}
