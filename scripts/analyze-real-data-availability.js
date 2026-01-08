/**
 * Script para analizar qué datos reales de Jira están disponibles
 * y qué podemos usar para calcular los KPIs
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

async function analyzeData() {
  console.log('🔍 Analyzing Real Jira Data Availability for KPIs\n');
  console.log('='.repeat(60));

  // 1. Analyze issues for Net Bug Flow
  console.log('\n📊 1. Analyzing Issues for Net Bug Flow...');
  try {
    const { data: issueTypes, error } = await supabase
      .from('issues')
      .select('issue_type')
      .limit(1000);

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else if (issueTypes && issueTypes.length > 0) {
      const typeCounts = {};
      issueTypes.forEach(issue => {
        const type = issue.issue_type || 'NULL';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      console.log('   ✅ Issue types found:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`      - ${type}: ${count} issues`);
      });

      const bugCount = issueTypes.filter(i => i.issue_type === 'Bug').length;
      if (bugCount > 0) {
        console.log(`   ✅ Can calculate Net Bug Flow: ${bugCount} bugs found`);
      } else {
        console.log('   ❌ Cannot calculate Net Bug Flow: No bugs found');
      }
    } else {
      console.log('   ⚠️  No issues found');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  // 2. Analyze status_by_sprint for Rework Rate
  console.log('\n📊 2. Analyzing Status History for Rework Rate...');
  try {
    const { data: issues, error } = await supabase
      .from('issues')
      .select('id, status_by_sprint')
      .limit(1000);

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else if (issues && issues.length > 0) {
      const withHistory = issues.filter(i => 
        i.status_by_sprint && 
        i.status_by_sprint !== '{}' && 
        typeof i.status_by_sprint === 'object'
      ).length;

      console.log(`   Total issues analyzed: ${issues.length}`);
      console.log(`   Issues with status_by_sprint: ${withHistory}`);
      
      if (withHistory > 0) {
        console.log(`   ✅ Can calculate Rework Rate: ${withHistory} issues with history`);
      } else {
        console.log('   ❌ Cannot calculate Rework Rate: No status history found');
      }
    } else {
      console.log('   ⚠️  No issues found');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  // 3. Analyze sprints for Planning Accuracy
  console.log('\n📊 3. Analyzing Sprints for Planning Accuracy...');
  try {
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select('id, sprint_name, planned_story_points, state')
      .eq('state', 'closed')
      .order('end_date', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else if (sprints && sprints.length > 0) {
      const withPlanned = sprints.filter(s => s.planned_story_points !== null).length;
      console.log(`   Closed sprints found: ${sprints.length}`);
      console.log(`   Sprints with planned_story_points: ${withPlanned}`);
      
      if (withPlanned > 0) {
        console.log(`   ✅ Can calculate Planning Accuracy: ${withPlanned} sprints with planned SP`);
      } else {
        console.log('   ⚠️  Cannot calculate Planning Accuracy: No planned_story_points set');
        console.log('   💡 Solution: Run populate script or set during planning');
      }
    } else {
      console.log('   ⚠️  No closed sprints found');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  // 4. Analyze sprint_metrics for Capacity Accuracy
  console.log('\n📊 4. Analyzing Sprint Metrics for Capacity Accuracy...');
  try {
    const { data: metrics, error } = await supabase
      .from('sprint_metrics')
      .select('sprint_id, workload_sp, velocity_sp, added_story_points')
      .order('calculated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else if (metrics && metrics.length > 0) {
      const withWorkload = metrics.filter(m => m.workload_sp !== null).length;
      console.log(`   Sprint metrics found: ${metrics.length}`);
      console.log(`   Metrics with workload_sp: ${withWorkload}`);
      
      if (withWorkload > 0) {
        console.log(`   ✅ Can calculate Capacity Accuracy: ${withWorkload} metrics with workload`);
      } else {
        console.log('   ⚠️  Cannot calculate Capacity Accuracy: No workload_sp data');
      }
    } else {
      console.log('   ⚠️  No sprint metrics found');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  // 5. Check deployments (will be empty, but check)
  console.log('\n📊 5. Checking Deployments...');
  try {
    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('id, deploy_date, status')
      .limit(10);

    if (error && error.code === '42P01') {
      console.log('   ❌ Deployments table does not exist - Run migrations first');
    } else if (deployments && deployments.length > 0) {
      console.log(`   ✅ Deployments found: ${deployments.length}`);
      console.log('   ✅ Can calculate Change Failure Rate');
    } else {
      console.log('   ⚠️  No deployments found');
      console.log('   ❌ Cannot calculate Change Failure Rate: No deployment data');
      console.log('   💡 Solution: Connect CI/CD or track deployments manually');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  // 6. Check eNPS responses (will be empty, but check)
  console.log('\n📊 6. Checking eNPS Responses...');
  try {
    const { data: responses, error } = await supabase
      .from('enps_responses')
      .select('id, survey_date, nps_score')
      .limit(10);

    if (error && error.code === '42P01') {
      console.log('   ❌ eNPS responses table does not exist - Run migrations first');
    } else if (responses && responses.length > 0) {
      console.log(`   ✅ eNPS responses found: ${responses.length}`);
      console.log('   ✅ Can calculate eNPS');
    } else {
      console.log('   ⚠️  No eNPS responses found');
      console.log('   ❌ Cannot calculate eNPS: No survey data');
      console.log('   💡 Solution: Implement survey UI or collect manually');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  // 7. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary: What Can Be Calculated from Real Jira Data');
  console.log('='.repeat(60));
  
  console.log('\n✅ Can Calculate Now (from Jira data):');
  console.log('   - Cycle Time: ✅ (from sprint_metrics.avg_lead_time_days)');
  console.log('   - Deploy Frequency: ⚠️  (estimated from sprints)');
  console.log('   - Net Bug Flow: ⚠️  (if issue_type is populated)');
  console.log('   - Rework Rate: ⚠️  (if status_by_sprint is populated)');
  console.log('   - Planning Accuracy: ⚠️  (if planned_story_points is set)');
  console.log('   - Capacity Accuracy: ⚠️  (if workload_sp exists)');
  
  console.log('\n❌ Cannot Calculate (needs external data):');
  console.log('   - Change Failure Rate: ❌ (needs deployments table data)');
  console.log('   - eNPS: ❌ (needs survey responses)');
  console.log('   - PR Size: ❌ (needs GitHub/GitLab integration)');
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Verify issue_type is populated for Net Bug Flow');
  console.log('   2. Verify status_by_sprint is populated for Rework Rate');
  console.log('   3. Populate planned_story_points for Planning Accuracy');
  console.log('   4. Connect CI/CD for deployments (Change Failure Rate)');
  console.log('   5. Implement survey UI for eNPS');
  
  console.log('\n✅ Analysis completed');
}

analyzeData()
  .then(() => {
    console.log('\n✅ Analysis completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during analysis:');
    console.error(error);
    process.exit(1);
  });

