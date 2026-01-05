/**
 * Script para poblar datos iniciales en las nuevas tablas
 * Solo pobla datos donde es posible sin integraciones externas
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for Node.js (using process.env instead of import.meta.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || null;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableExists(tableName) {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    // If we get data or error code PGRST116 (no rows), table exists
    if (error && error.code !== 'PGRST116') {
      // Check if it's a "relation does not exist" error
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function populatePlanningFields() {
  console.log('\n📊 Populating Planning Fields...');
  
  if (!supabase) {
    console.log('⚠️  Supabase not configured, skipping');
    return { success: false, reason: 'Supabase not configured' };
  }

  try {
    // Get recent closed sprints with their metrics
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select(`
        id, 
        sprint_name, 
        planned_story_points,
        sprint_metrics!inner(
          total_story_points,
          completed_story_points
        )
      `)
      .eq('state', 'closed')
      .order('end_date', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`⚠️  Error getting sprints: ${error.message}`);
      // Try alternative approach without join
      return await populatePlanningFieldsAlternative();
    }

    if (!sprints || sprints.length === 0) {
      console.log('⚠️  No closed sprints found');
      return { success: false, reason: 'No sprints found' };
    }

    let updated = 0;
    let skipped = 0;
    for (const sprint of sprints) {
      // Get the most recent metric for this sprint
      const metrics = sprint.sprint_metrics;
      if (!metrics || metrics.length === 0) {
        skipped++;
        continue;
      }
      
      const latestMetric = metrics[0]; // Get first (should be most recent)
      const totalSP = latestMetric.total_story_points;
      
      // Use total_story_points from metrics as planned_story_points if not set
      if (!sprint.planned_story_points && totalSP) {
        console.log(`   Updating sprint ${sprint.sprint_name} with planned_story_points: ${totalSP}`);
        const { error: updateError } = await supabase
          .from('sprints')
          .update({ planned_story_points: totalSP })
          .eq('id', sprint.id);

        if (!updateError) {
          updated++;
        } else {
          console.log(`   ⚠️  Error updating sprint ${sprint.sprint_name}: ${updateError.message}`);
        }
      } else if (sprint.planned_story_points) {
        skipped++;
      }
    }
    
    if (skipped > 0) {
      console.log(`   Skipped ${skipped} sprints (already have planned_story_points or no metrics)`);
    }

    console.log(`✅ Updated ${updated} sprints with planned_story_points`);
    return { success: true, updated };
  } catch (error) {
    console.error('❌ Error populating planning fields:', error);
    return await populatePlanningFieldsAlternative();
  }
}

async function populatePlanningFieldsAlternative() {
  try {
    // Alternative: Get sprints and metrics separately
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, sprint_name, planned_story_points')
      .eq('state', 'closed')
      .order('end_date', { ascending: false })
      .limit(10);

    if (sprintsError || !sprints || sprints.length === 0) {
      return { success: false, reason: 'No sprints found' };
    }

    let updated = 0;
    let skipped = 0;
    for (const sprint of sprints) {
      if (sprint.planned_story_points) {
        skipped++;
        continue; // Already set
      }
      
      console.log(`   Processing sprint: ${sprint.sprint_name}`);
      
      // Get metrics for this sprint
      const { data: metrics, error: metricsError } = await supabase
        .from('sprint_metrics')
        .select('total_story_points')
        .eq('sprint_id', sprint.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (metricsError) {
        console.log(`   ⚠️  No metrics found for sprint ${sprint.sprint_name}: ${metricsError.message}`);
        skipped++;
        continue;
      }

      if (metrics && metrics.total_story_points) {
        console.log(`   Updating sprint ${sprint.sprint_name} with planned_story_points: ${metrics.total_story_points}`);
        const { error: updateError } = await supabase
          .from('sprints')
          .update({ planned_story_points: metrics.total_story_points })
          .eq('id', sprint.id);

        if (!updateError) {
          updated++;
          console.log(`   ✅ Updated sprint ${sprint.sprint_name}`);
        } else {
          console.log(`   ❌ Error updating sprint ${sprint.sprint_name}: ${updateError.message}`);
        }
      } else {
        skipped++;
        console.log(`   ⚠️  Sprint ${sprint.sprint_name} has no total_story_points in metrics`);
      }
    }
    
    if (skipped > 0) {
      console.log(`   Skipped ${skipped} sprints`);
    }

    console.log(`✅ Updated ${updated} sprints with planned_story_points`);
    return { success: true, updated };
  } catch (error) {
    console.error('❌ Error in alternative method:', error);
    return { success: false, reason: error.message };
  }
}

async function populateAddedStoryPoints() {
  console.log('\n📊 Calculating Added Story Points...');
  
  if (!supabase) {
    console.log('⚠️  Supabase not configured, skipping');
    return { success: false, reason: 'Supabase not configured' };
  }

  try {
    // Check if function exists
    const { data: funcExists, error: funcError } = await supabase.rpc('calculate_added_story_points', {
      p_sprint_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID to test if function exists
    });

    if (funcError && funcError.message.includes('does not exist')) {
      console.log('⚠️  Function calculate_added_story_points does not exist');
      console.log('   Please run migration 09_add_planning_capacity_fields.sql first');
      return { success: false, reason: 'Function does not exist' };
    }

    // Get recent closed sprints
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select('id')
      .eq('state', 'closed')
      .order('end_date', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`⚠️  Error getting sprints: ${error.message}`);
      return { success: false, reason: error.message };
    }

    if (!sprints || sprints.length === 0) {
      console.log('⚠️  No closed sprints found');
      return { success: false, reason: 'No sprints found' };
    }

    let updated = 0;
    let processed = 0;
    for (const sprint of sprints) {
      try {
        processed++;
        console.log(`   Processing sprint ${processed}/${sprints.length}...`);
        
        // Calculate added story points
        const { data: addedSP, error: calcError } = await supabase.rpc('calculate_added_story_points', {
          p_sprint_id: sprint.id
        });

        if (calcError) {
          console.log(`   ⚠️  Error calculating for sprint ${sprint.id}: ${calcError.message}`);
          continue;
        }

        console.log(`   Calculated added_story_points: ${addedSP} for sprint ${sprint.id}`);

        // Update sprint_metrics - need to update the most recent metric
        const { data: latestMetric, error: metricError } = await supabase
          .from('sprint_metrics')
          .select('id, calculated_at')
          .eq('sprint_id', sprint.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single();

        if (metricError) {
          console.log(`   ⚠️  No metrics found for sprint ${sprint.id}`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('sprint_metrics')
          .update({ added_story_points: addedSP })
          .eq('id', latestMetric.id);

        if (!updateError) {
          updated++;
        }
      } catch (err) {
        console.log(`⚠️  Error processing sprint ${sprint.id}: ${err.message}`);
      }
    }

    console.log(`✅ Updated ${updated} sprint_metrics with added_story_points`);
    return { success: true, updated };
  } catch (error) {
    console.error('❌ Error populating added story points:', error);
    return { success: false, reason: error.message };
  }
}

async function checkDeploymentsTable() {
  console.log('\n📊 Checking Deployments Table...');
  
  const exists = await checkTableExists('deployments');
  if (exists) {
    console.log('✅ Deployments table exists');
    console.log('⚠️  To populate: Connect CI/CD or insert manually');
    return { success: true, exists: true };
  } else {
    console.log('❌ Deployments table does not exist');
    console.log('   Please run migration 08_create_deployments_table.sql first');
    return { success: false, exists: false };
  }
}

async function checkENPSTable() {
  console.log('\n📊 Checking eNPS Responses Table...');
  
  const exists = await checkTableExists('enps_responses');
  if (exists) {
    console.log('✅ eNPS responses table exists');
    console.log('⚠️  To populate: Use UI (To Be Connected) or insert manually');
    return { success: true, exists: true };
  } else {
    console.log('❌ eNPS responses table does not exist');
    console.log('   Please run migration 10_create_enps_responses_table.sql first');
    return { success: false, exists: false };
  }
}

async function main() {
  console.log('🚀 Starting Initial Data Population\n');
  console.log('='.repeat(60));
  
  console.log('📋 Environment check:');
  console.log(`   VITE_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'NOT SET'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : 'NOT SET'}`);
  console.log('');

  if (!supabase) {
    console.error('❌ Supabase is not configured');
    console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
    process.exit(1);
  }

  console.log('✅ Supabase client created\n');
  
  // Test connection
  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase connection test failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection verified\n');
  } catch (err) {
    console.error('❌ Error testing Supabase connection:', err.message);
    process.exit(1);
  }

  const results = {
    planningFields: await populatePlanningFields(),
    addedStoryPoints: await populateAddedStoryPoints(),
    deployments: await checkDeploymentsTable(),
    enps: await checkENPSTable()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Planning Fields: ${results.planningFields.success ? '✅' : '❌'}`);
  console.log(`   Added Story Points: ${results.addedStoryPoints.success ? '✅' : '❌'}`);
  console.log(`   Deployments Table: ${results.deployments.exists ? '✅ Exists' : '❌ Not found'}`);
  console.log(`   eNPS Table: ${results.enps.exists ? '✅ Exists' : '❌ Not found'}`);

  console.log('\n📝 Next Steps:');
  if (!results.deployments.exists) {
    console.log('   1. Run migration 08_create_deployments_table.sql');
    console.log('   2. Connect CI/CD or populate manually');
  }
  if (!results.enps.exists) {
    console.log('   3. Run migration 10_create_enps_responses_table.sql');
    console.log('   4. Implement UI for surveys or populate manually');
  }

  console.log('\n✅ Data population completed');
}

main().catch(console.error);

