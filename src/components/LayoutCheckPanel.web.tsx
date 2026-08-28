import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { layoutIssueCounts, LayoutIssue, validateKitchenLayout } from '../domain/designValidation';
import { EditorProject } from '../domain/editor';
import { canAutoFixLayoutIssue, fixLayoutIssue, focusLayoutIssue } from '../domain/layoutFixes';

type Props = {
  project: EditorProject;
  apply: (project: EditorProject, record?: boolean) => void;
};

const actionLabel = (issue: LayoutIssue) => {
  if (issue.id === 'missing-sink') return 'Add Sink Base';
  if (issue.id === 'missing-range') return 'Add Range';
  if (issue.id === 'missing-refrigerator') return 'Add Refrigerator';
  if (issue.id.startsWith('opening-wall-')) return 'Attach to Wall';
  return 'Select in Plan';
};

export function LayoutCheckPanel({ project, apply }: Props) {
  const issues = useMemo(() => validateKitchenLayout(project), [project]);
  const counts = useMemo(() => layoutIssueCounts(issues), [issues]);

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Layout Check</Text>
    <Text style={s.help}>Kitchen AI checks core fixtures, overlaps, island aisles, room boundaries and wall openings. Results update as the project changes.</Text>
    <View style={s.summary} accessibilityLabel={`${counts.errors} errors, ${counts.warnings} warnings`}>
      <View style={[s.countCard, s.errorCard]}><Text style={s.count}>{counts.errors}</Text><Text style={s.countLabel}>Errors</Text></View>
      <View style={[s.countCard, s.warningCard]}><Text style={s.count}>{counts.warnings}</Text><Text style={s.countLabel}>Warnings</Text></View>
      <View style={[s.countCard, s.infoCard]}><Text style={s.count}>{counts.info}</Text><Text style={s.countLabel}>Passed</Text></View>
    </View>
    {issues.map(issue => {
      const objects = issue.objectIds.map(id => project.objects.find(object => object.id === id)?.name).filter(Boolean).join(' · ');
      const automatic = canAutoFixLayoutIssue(issue);
      return <View key={issue.id} style={[s.issue, issue.severity === 'error' ? s.issueError : issue.severity === 'warning' ? s.issueWarning : s.issueInfo]}>
        <View style={s.issueHeader}>
          <Text style={s.issueIcon}>{issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '△' : '✓'}</Text>
          <View style={s.issueCopy}><Text style={s.issueTitle}>{issue.title}</Text>{objects ? <Text style={s.objects}>{objects}</Text> : null}</View>
        </View>
        <Text style={s.detail}>{issue.detail}</Text>
        {issue.severity !== 'info' && <Pressable accessibilityRole="button" onPress={() => automatic ? apply(fixLayoutIssue(project, issue), true) : apply(focusLayoutIssue(project, issue), false)} style={s.action}>
          <Text style={s.actionText}>{actionLabel(issue)}</Text>
        </Pressable>}
      </View>;
    })}
    <Text style={s.note}>Layout Check is an early design safeguard, not a substitute for field measurements, appliance specifications, code review or a final installer verification.</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  container: { paddingBottom: 22 },
  title: { fontSize: 18, fontWeight: '900', color: '#1D2A27', marginBottom: 6 },
  help: { fontSize: 13, lineHeight: 19, color: '#5C6B66', marginBottom: 12 },
  summary: { flexDirection: 'row', gap: 6, marginBottom: 13 },
  countCard: { flex: 1, minHeight: 64, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  errorCard: { backgroundColor: '#FCE9E6', borderColor: '#D89A91' },
  warningCard: { backgroundColor: '#FFF4D8', borderColor: '#D8B866' },
  infoCard: { backgroundColor: '#E5F2EC', borderColor: '#8DB6A7' },
  count: { fontSize: 20, fontWeight: '900', color: '#263530' },
  countLabel: { fontSize: 10, fontWeight: '800', color: '#50605A', textTransform: 'uppercase' },
  issue: { borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 9, backgroundColor: '#FFFFFF' },
  issueError: { borderColor: '#D89A91' },
  issueWarning: { borderColor: '#D8B866' },
  issueInfo: { borderColor: '#8DB6A7' },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  issueIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E7ECEA', textAlign: 'center', textAlignVertical: 'center', fontSize: 15, fontWeight: '900', color: '#263530' },
  issueCopy: { flex: 1 },
  issueTitle: { fontSize: 14, fontWeight: '900', color: '#263530' },
  objects: { fontSize: 10, fontWeight: '700', color: '#60706A', marginTop: 2 },
  detail: { fontSize: 12, lineHeight: 18, color: '#596963', marginTop: 8 },
  action: { minHeight: 42, marginTop: 9, borderRadius: 8, borderWidth: 1, borderColor: '#6E9C8E', backgroundColor: '#EEF6F3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  actionText: { fontSize: 12, fontWeight: '900', color: '#245345' },
  note: { fontSize: 11, lineHeight: 17, color: '#69756F', marginTop: 5 },
});
