import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, useWindowDimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSheetData, Project } from '../hooks/useSheetData';
import { Badge, LoadingScreen, ErrorScreen, SectionTitle, GaugeChart } from '../components/ui';
import { COLORS, FONT } from '../constants';
import { useLayout } from '../hooks/useLayout';

function ProjectCard({ project, onPress, cardW }: { project: Project; onPress: () => void; cardW: number }) {
  const { isTV } = useLayout();
  const spent = Number(project.spent_to_date_usd);
  const total = Number(project.total_budget_usd);
  const budgetPct = total > 0 ? Math.round((spent / total) * 100) : 0;
  const gaugeSize = isTV ? 160 : 140;

  return (
    <TouchableOpacity style={[styles.card, { width: cardW }]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.projName, isTV && styles.projNameTV]}>{project.project_name}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.midGray} />
            <Text style={styles.projLoc}>{project.location}</Text>
          </View>
        </View>
        <Badge label={project.status} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <GaugeChart value={Number(project.progress_pct)} max={100} label={`${project.progress_pct}%`} sublabel="vs plan" size={gaugeSize} />
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.statChip}>
          <Ionicons name="people-outline" size={13} color={COLORS.midGray} />
          <Text style={styles.chipVal}>{project.workers_count}</Text>
          <Text style={styles.chipLab}>workers</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="construct-outline" size={13} color={COLORS.midGray} />
          <Text style={styles.chipVal}>{project.equipment_count}</Text>
          <Text style={styles.chipLab}>equip.</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="trending-up-outline" size={13} color={Number(project.cpi) >= 1 ? COLORS.green : COLORS.red} />
          <Text style={[styles.chipVal, { color: Number(project.cpi) >= 1 ? COLORS.green : COLORS.red }]}>{project.cpi}</Text>
          <Text style={styles.chipLab}>CPI</Text>
        </View>
      </View>

      <View style={styles.budgetStrip}>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Budget used</Text>
          <Text style={styles.budgetPct}>{budgetPct}%</Text>
        </View>
        <View style={styles.budgetBg}>
          <View style={[styles.budgetFill, {
            width: `${Math.min(100, budgetPct)}%`,
            backgroundColor: budgetPct > 90 ? COLORS.red : budgetPct > 75 ? '#fb8c00' : COLORS.black,
          }]} />
        </View>
        <Text style={styles.budgetSub}>${(spent / 1e6).toFixed(1)}M of ${(total / 1e6).toFixed(1)}M</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, loading, error, refresh } = useSheetData();
  const { isTV, W, padding } = useLayout();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen message={error ?? 'No data'} onRetry={refresh} />;

  // On TV: show all 3 cards side by side
  const numCols = isTV ? Math.min(data.projects.length, 3) : 1;
  const cardW = isTV ? Math.floor((W - (numCols - 1) * 12) / numCols) : W;

  const Header = (
    <View style={[styles.header, { paddingHorizontal: padding }]}>
      <View style={styles.logoRow}>
        <View style={[styles.logoBox, isTV && styles.logoBoxTV]}>
          <Ionicons name="business" size={isTV ? 22 : 16} color={COLORS.white} />
        </View>
        <View>
          <Text style={[styles.wordmark, isTV && styles.wordmarkTV]}>ISKER</Text>
          <Text style={[styles.wordmarkSub, isTV && styles.wordmarkSubTV]}>Construction Management</Text>
        </View>
      </View>
      <SectionTitle style={{ marginTop: isTV ? 28 : 20 }}>Active Projects</SectionTitle>
    </View>
  );

  if (isTV) {
    // TV: horizontal row of cards, no FlatList
    return (
      <View style={[styles.tvContainer, { padding }]}>
        {Header}
        <View style={styles.tvRow}>
          {data.projects.map((p) => (
            <ProjectCard
              key={p.project_id}
              project={p}
              cardW={cardW}
              onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.project_id } })}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={data.projects}
      keyExtractor={(p) => p.project_id}
      contentContainerStyle={[styles.list, { padding }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      ListHeaderComponent={Header}
      renderItem={({ item }) => (
        <ProjectCard
          project={item}
          cardW={cardW}
          onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.project_id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  header: { marginBottom: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  logoBox: { width: 34, height: 34, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' },
  logoBoxTV: { width: 48, height: 48 },
  wordmark: { fontSize: 18, fontWeight: '700', letterSpacing: 3, color: COLORS.black },
  wordmarkTV: { fontSize: 26, letterSpacing: 5 },
  wordmarkSub: { fontSize: FONT.size.xs, color: COLORS.midGray, letterSpacing: 0.5 },
  wordmarkSubTV: { fontSize: 14 },
  tvContainer: { flex: 1, backgroundColor: COLORS.background },
  tvRow: { flexDirection: 'row', gap: 12 },
  card: {
    backgroundColor: COLORS.white, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 14, paddingBottom: 0,
  },
  projName: { fontSize: FONT.size.md, fontWeight: '600', color: COLORS.black, marginBottom: 3 },
  projNameTV: { fontSize: 18 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  projLoc: { fontSize: FONT.size.xs, color: COLORS.midGray },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 14, paddingBottom: 10 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipVal: { fontSize: FONT.size.sm, fontWeight: '600', color: COLORS.black },
  chipLab: { fontSize: FONT.size.xs, color: COLORS.midGray },
  budgetStrip: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, paddingTop: 10 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  budgetLabel: { fontSize: FONT.size.xs, color: COLORS.midGray },
  budgetPct: { fontSize: FONT.size.xs, fontWeight: '600', color: COLORS.black },
  budgetBg: { height: 4, backgroundColor: '#eee', marginBottom: 5 },
  budgetFill: { height: 4 },
  budgetSub: { fontSize: FONT.size.xs, color: COLORS.midGray },
});
