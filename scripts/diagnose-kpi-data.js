/**
 * Script de diagnóstico para verificar por qué los KPIs están usando datos mock
 * en lugar de datos reales de Jira
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || null;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNetBugFlow() {
  console.log('\n📊 Checking Net Bug Flow Data...');
  
  // Check if issue_type is populated
  const { data: sampleIssue, error: sampleError } = await supabase
    .from('issues')
    .select('issue_type')
    .limit(1)
    .single();

  if (sampleError) {
    console.log('   ❌ Error checking issues:', sampleError.message);
    return false;
  }

  if (!sampleIssue || !sampleIssue.issue_type) {
    console.log('   ❌ issue_type is NOT populated in issues table');
    console.log('   💡 Solution: Ensure Jira sync populates issue_type field');
    return false;
  }

  console.log('   ✅ issue_type is populated');

  // Check bugs in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: bugs, error } = await supabase
    .from('issues')
    .select('id, issue_type, created_date, resolved_date')
    .eq('issue_type', 'Bug')
    .gte('created_date', ninetyDaysAgo.toISOString());

  if (error) {
    console.log('   ❌ Error querying bugs:', error.message);
    return false;
  }

  if (!bugs || bugs.length === 0) {
    console.log('   ⚠️  No bugs found in last 90 days');
    console.log('   💡 This is OK - Net Bug Flow will use mock data if no bugs exist');
    return false;
  }

  const bugsCreated = bugs.filter(bug => {
    const created = bug.created_date ? new Date(bug.created_date) : null;
    return created && created >= ninetyDaysAgo;
  }).length;

  const bugsResolved = bugs.filter(bug => {
    const resolved = bug.resolved_date ? new Date(bug.resolved_date) : null;
    return resolved && resolved >= ninetyDaysAgo;
  }).length;

  console.log(`   ✅ Found ${bugs.length} bugs in last 90 days`);
  console.log(`   ✅ Bugs created: ${bugsCreated}, Bugs resolved: ${bugsResolved}`);
  return true;
}

async function checkReworkRate() {
  console.log('\n📊 Checking Rework Rate Data...');
  
  // Check if function exists
  const { data: funcTest, error: funcError } = await supabase.rpc('calculate_rework_rate', {
    p_sprint_id: null,
    p_start_date: null,
    p_end_date: null
  });

  if (funcError) {
    if (funcError.message.includes('does not exist')) {
      console.log('   ❌ Function calculate_rework_rate does not exist');
      console.log('   💡 Solution: Run migration 11_calculate_rework_from_history.sql');
      return false;
    }
    console.log('   ⚠️  Function exists but returned error:', funcError.message);
    // Function exists, might just be no data
  }

  // Check if status_by_sprint is populated
  const { data: issuesWithHistory, error: historyError } = await supabase
    .from('issues')
    .select('id, status_by_sprint')
    .not('status_by_sprint', 'is', null)
    .limit(1);

  if (historyError) {
    console.log('   ❌ Error checking status_by_sprint:', historyError.message);
    return false;
  }

  if (!issuesWithHistory || issuesWithHistory.length === 0) {
    console.log('   ❌ status_by_sprint is NOT populated');
    console.log('   💡 Solution: Ensure Jira sync populates status_by_sprint field');
    return false;
  }

  console.log('   ✅ status_by_sprint is populated');
  
  if (!funcError && funcTest) {
    console.log('   ✅ Function calculate_rework_rate exists and returns data');
    return true;
  }

  return false;
}

async function checkPlanningAccuracy() {
  console.log('\n📊 Checking Planning Accuracy Data...');
  
  // Check sprint_metrics
  const { data: metrics, error } = await supabase
    .from('sprint_metrics')
    .select('id, total_story_points, completed_story_points, added_story_points, sprint_id')
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.log('   ❌ Error getting sprint_metrics:', error.message);
    return false;
  }

  if (!metrics) {
    console.log('   ❌ No sprint_metrics found');
    console.log('   💡 Solution: Ensure sprint metrics are calculated');
    return false;
  }

  console.log('   ✅ Found sprint_metrics');
  console.log(`   ✅ total_story_points: ${metrics.total_story_points || 'NULL'}`);
  console.log(`   ✅ completed_story_points: ${metrics.completed_story_points || 'NULL'}`);
  console.log(`   ✅ added_story_points: ${metrics.added_story_points || 'NULL'}`);

  // Check if planned_story_points is set in sprint
  const { data: sprint, error: sprintError } = await supabase
    .from('sprints')
    .select('id, planned_story_points')
    .eq('id', metrics.sprint_id)
    .single();

  if (!sprintError && sprint) {
    console.log(`   ✅ Sprint planned_story_points: ${sprint.planned_story_points || 'NULL (will use total_story_points)'}`);
  }

  if (!metrics.total_story_points && !metrics.completed_story_points) {
    console.log('   ⚠️  Missing required fields - will use mock data');
    return false;
  }

  return true;
}

async function checkCapacityAccuracy() {
  console.log('\n📊 Checking Capacity Accuracy Data...');
  
  // Check developer_sprint_metrics
  const { data: devMetrics, error: devError } = await supabase
    .from('developer_sprint_metrics')
    .select('id, workload_sp, velocity_sp, sprint_id')
    .limit(1)
    .single();

  if (devError) {
    console.log('   ❌ Error getting developer_sprint_metrics:', devError.message);
    return false;
  }

  if (!devMetrics) {
    console.log('   ❌ No developer_sprint_metrics found');
    console.log('   💡 Solution: Ensure developer sprint metrics are calculated');
    return false;
  }

  console.log('   ✅ Found developer_sprint_metrics');
  console.log(`   ✅ workload_sp: ${devMetrics.workload_sp || 'NULL'}`);
  console.log(`   ✅ velocity_sp: ${devMetrics.velocity_sp || 'NULL'}`);

  // Check sprint planned_capacity_hours
  const { data: sprint, error: sprintError } = await supabase
    .from('sprints')
    .select('id, planned_capacity_hours, planned_story_points')
    .eq('id', devMetrics.sprint_id)
    .single();

  if (!sprintError && sprint) {
    console.log(`   ✅ Sprint planned_capacity_hours: ${sprint.planned_capacity_hours || 'NULL'}`);
    console.log(`   ✅ Sprint planned_story_points: ${sprint.planned_story_points || 'NULL'}`);
  }

  if (!devMetrics.workload_sp) {
    console.log('   ⚠️  Missing workload_sp - will use mock data');
    return false;
  }

  return true;
}

async function checkChangeFailureRate() {
  console.log('\n📊 Checking Change Failure Rate Data...');
  
  // Check if deployments table exists
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('id, deploy_date, status, environment')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('   ❌ Deployments table does not exist');
      console.log('   💡 Solution: Run migration 08_create_deployments_table.sql');
      return false;
    }
    console.log('   ❌ Error checking deployments:', error.message);
    return false;
  }

  if (!deployments || deployments.length === 0) {
    console.log('   ⚠️  Deployments table exists but is empty');
    console.log('   💡 Solution: Connect CI/CD or populate manually');
    return false;
  }

  // Check production deployments in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: recentDeploys, error: recentError } = await supabase
    .from('deployments')
    .select('id, status')
    .eq('environment', 'production')
    .gte('deploy_date', ninetyDaysAgo.toISOString());

  if (recentError) {
    console.log('   ❌ Error querying recent deployments:', recentError.message);
    return false;
  }

  if (!recentDeploys || recentDeploys.length === 0) {
    console.log('   ⚠️  No production deployments in last 90 days');
    console.log('   💡 Solution: Connect CI/CD to populate deployments');
    return false;
  }

  console.log(`   ✅ Found ${recentDeploys.length} production deployments in last 90 days`);
  return true;
}

async function checkENPS() {
  console.log('\n📊 Checking eNPS Data...');
  
  // Check if enps_responses table exists
  const { data: responses, error } = await supabase
    .from('enps_responses')
    .select('id, survey_date, nps_score')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('   ❌ eNPS responses table does not exist');
      console.log('   💡 Solution: Run migration 10_create_enps_responses_table.sql');
      return false;
    }
    console.log('   ❌ Error checking eNPS responses:', error.message);
    return false;
  }

  if (!responses || responses.length === 0) {
    console.log('   ⚠️  eNPS responses table exists but is empty');
    console.log('   💡 Solution: Implement survey UI or populate manually');
    return false;
  }

  // Check function
  const { data: funcTest, error: funcError } = await supabase.rpc('calculate_enps', {
    p_start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    p_end_date: new Date().toISOString().split('T')[0]
  });

  if (funcError) {
    console.log('   ⚠️  Function calculate_enps error:', funcError.message);
    return false;
  }

  console.log(`   ✅ Found ${responses.length} eNPS responses`);
  if (funcTest && funcTest[0]) {
    console.log(`   ✅ eNPS value: ${funcTest[0].enps_value}`);
  }
  return true;
}

async function main() {
  console.log('🔍 KPI Data Diagnostic Tool');
  console.log('='.repeat(60));
  console.log('\nChecking which KPIs can use REAL data from Jira...\n');

  const results = {
    netBugFlow: await checkNetBugFlow(),
    reworkRate: await checkReworkRate(),
    planningAccuracy: await checkPlanningAccuracy(),
    capacityAccuracy: await checkCapacityAccuracy(),
    changeFailureRate: await checkChangeFailureRate(),
    enps: await checkENPS()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`   Net Bug Flow:        ${results.netBugFlow ? '✅ REAL DATA' : '❌ MOCK DATA'}`);
  console.log(`   Rework Rate:         ${results.reworkRate ? '✅ REAL DATA' : '❌ MOCK DATA'}`);
  console.log(`   Planning Accuracy:   ${results.planningAccuracy ? '✅ REAL DATA' : '❌ MOCK DATA'}`);
  console.log(`   Capacity Accuracy:  ${results.capacityAccuracy ? '✅ REAL DATA' : '❌ MOCK DATA'}`);
  console.log(`   Change Failure Rate: ${results.changeFailureRate ? '✅ REAL DATA' : '❌ MOCK DATA'}`);
  console.log(`   eNPS:                ${results.enps ? '✅ REAL DATA' : '❌ MOCK DATA'}`);

  console.log('\n💡 Next Steps:');
  if (!results.netBugFlow) {
    console.log('   - Ensure Jira sync populates issue_type field');
  }
  if (!results.reworkRate) {
    console.log('   - Run migration 11_calculate_rework_from_history.sql');
    console.log('   - Ensure Jira sync populates status_by_sprint field');
  }
  if (!results.planningAccuracy) {
    console.log('   - Ensure sprint_metrics has total_story_points and completed_story_points');
    console.log('   - Run populate-kpi-data script to set planned_story_points');
  }
  if (!results.capacityAccuracy) {
    console.log('   - Ensure developer_sprint_metrics has workload_sp');
    console.log('   - Set planned_capacity_hours in sprints or ensure planned_story_points is set');
  }
  if (!results.changeFailureRate) {
    console.log('   - Run migration 08_create_deployments_table.sql');
    console.log('   - Connect CI/CD to populate deployments table');
  }
  if (!results.enps) {
    console.log('   - Run migration 10_create_enps_responses_table.sql');
    console.log('   - Implement survey UI or populate manually');
  }

  console.log('\n✅ Diagnostic completed');
}

main().catch(console.error);

