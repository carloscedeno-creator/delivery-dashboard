import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle, AlertCircle, Star, Smile, Frown } from 'lucide-react';
import { submitENPSResponse, hasRespondedToday, getLatestResponse } from '../services/enpsSurveyService';
import { getCurrentUser } from '../utils/authService';
import { getActiveSurvey } from '../services/enpsSurveyManagementService';

/**
 * eNPS Survey Component
 * Allows developers to respond to the Employee Net Promoter Score survey
 */
const ENPSSurvey = () => {
  const [npsScore, setNpsScore] = useState(null);
  const [comments, setComments] = useState('');
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [squads, setSquads] = useState([]);
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [hasResponded, setHasResponded] = useState(false);
  const [latestResponse, setLatestResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [developerEmail, setDeveloperEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [noActiveSurvey, setNoActiveSurvey] = useState(false);

  const currentUser = getCurrentUser();
  
  // Load active survey and squads
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadingSquads(true);
        
        // Load active survey
        const survey = await getActiveSurvey();
        if (survey) {
          setActiveSurvey(survey);
          setNoActiveSurvey(false);
          // Si no hay usuario autenticado, mostrar input de email
          if (!currentUser) {
            setShowEmailInput(true);
          }
        } else {
          setNoActiveSurvey(true);
          setActiveSurvey(null);
        }
        
        // Load squads
        const { supabase } = await import('../utils/supabaseApi');
        if (supabase) {
          const { data: squadsData, error: squadsError } = await supabase
            .from('squads')
            .select('id, squad_key, squad_name')
            .order('squad_name', { ascending: true });
          
          if (!squadsError && squadsData) {
            setSquads(squadsData);
          }
        }
      } catch (err) {
        console.error('[ENPS_SURVEY] Error loading data:', err);
        setNoActiveSurvey(true);
        setActiveSurvey(null);
      } finally {
        setLoading(false);
        setLoadingSquads(false);
      }
    };
    
    loadData();
  }, [currentUser]);

  useEffect(() => {
    const checkResponse = async () => {
      // Si no hay survey activo, no verificar respuesta
      if (!activeSurvey) {
        return;
      }
      
      // Si no hay usuario autenticado y no hay email, no verificar respuesta
      if (!currentUser && !developerEmail) {
        return;
      }
      
      try {
        setLoading(true);
        // Si hay email pero no usuario, buscar developer por email primero
        let respondentId = null;
        if (!currentUser && developerEmail) {
          const { supabase } = await import('../utils/supabaseApi');
          if (supabase) {
            const { data: developer } = await supabase
              .from('developers')
              .select('id')
              .eq('email', developerEmail.toLowerCase().trim())
              .single();
            
            if (developer) {
              respondentId = developer.id;
            } else {
              // Developer no encontrado, permitir continuar pero mostrar advertencia
              console.warn('[ENPS_SURVEY] Developer not found with email:', developerEmail);
              setLoading(false);
              return;
            }
          }
        }
        
        // Check response for this specific survey
        const responded = await hasRespondedToday(respondentId, activeSurvey.id);
        setHasResponded(responded);
        
        if (responded) {
          const response = await getLatestResponse(respondentId, activeSurvey.id);
          // Verify response is for the active survey
          if (response && response.survey_id === activeSurvey.id) {
            setLatestResponse(response);
            setNpsScore(response.nps_score);
            setComments(response.comments || '');
            if (response.squad_id) {
              setSelectedSquad(response.squad_id);
            }
          }
        }
      } catch (err) {
        console.error('[ENPS_SURVEY] Error checking response:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeSurvey && (currentUser || developerEmail)) {
      checkResponse();
    }
  }, [currentUser, developerEmail, activeSurvey]);

  const handleScoreClick = (score) => {
    setNpsScore(score);
    setError(null);
  };

  const getScoreLabel = (score) => {
    if (score >= 9) return 'Promoter';
    if (score >= 7) return 'Passive';
    return 'Detractor';
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'emerald';
    if (score >= 7) return 'amber';
    return 'rose';
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!developerEmail || !developerEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Verificar que el developer existe
    try {
      const { supabase } = await import('../utils/supabaseApi');
      if (supabase) {
        const { data: developer } = await supabase
          .from('developers')
          .select('id, display_name')
          .eq('email', developerEmail.toLowerCase().trim())
          .single();
        
        if (!developer) {
          setError('Developer not found. Please check your email address.');
          return;
        }
        
        setShowEmailInput(false);
        setError(null);
        // Trigger check response with the developer ID and active survey
        if (activeSurvey) {
          const responded = await hasRespondedToday(developer.id, activeSurvey.id);
          setHasResponded(responded);
          if (responded) {
            const response = await getLatestResponse(developer.id, activeSurvey.id);
            if (response && response.survey_id === activeSurvey.id) {
              setLatestResponse(response);
              setNpsScore(response.nps_score);
              setComments(response.comments || '');
            }
          }
        }
      }
    } catch (err) {
      console.error('[ENPS_SURVEY] Error verifying email:', err);
      setError('Error verifying email. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (npsScore === null) {
      setError('Please select a score from 0 to 10');
      return;
    }

    if (!selectedSquad) {
      setError('Please select your squad');
      return;
    }

    // Si no hay usuario autenticado, necesitamos el email
    if (!currentUser && !developerEmail) {
      setError('Please enter your email address first');
      setShowEmailInput(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Si hay email pero no usuario, buscar developer ID
      let respondentId = null;
      if (!currentUser && developerEmail) {
        const { supabase } = await import('../utils/supabaseApi');
        if (supabase) {
          const { data: developer } = await supabase
            .from('developers')
            .select('id')
            .eq('email', developerEmail.toLowerCase().trim())
            .single();
          
          if (developer) {
            respondentId = developer.id;
          }
        }
      }
      
      await submitENPSResponse({
        npsScore,
        comments: comments.trim() || null,
        surveyPeriod: 'weekly',
        respondentId,
        surveyId: activeSurvey?.id || null,
        squadId: selectedSquad
      });

      setSubmitted(true);
      setHasResponded(true);
      
      // Refresh latest response
      const response = await getLatestResponse(respondentId, activeSurvey?.id || null);
      setLatestResponse(response);
    } catch (err) {
      console.error('[ENPS_SURVEY] Error submitting response:', err);
      setError(err.message || 'Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !noActiveSurvey) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading survey...</p>
      </div>
    );
  }

  // Show message if no active survey
  if (noActiveSurvey && !activeSurvey) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-8 border border-slate-700/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <AlertCircle className="text-amber-400" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">No Active Survey</h1>
              <p className="text-slate-400">
                There is currently no active survey. Please contact an administrator to activate a survey.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado y no se ha ingresado email, mostrar formulario de email
  if (showEmailInput && !currentUser) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-8 border border-slate-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <MessageSquare className="text-blue-400" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Team Satisfaction Survey</h1>
              <p className="text-slate-400">
                Please enter your email to continue
              </p>
            </div>
          </div>
          
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@company.com"
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full px-8 py-3 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/50 transition-all"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-blue-500/20">
            <MessageSquare className="text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {activeSurvey ? `Team Satisfaction Survey: ${activeSurvey.survey_name}` : 'Team Satisfaction Survey'}
            </h1>
            <p className="text-slate-400">
              {activeSurvey?.description || 'Help us understand how you feel about working in this team'}
            </p>
            {activeSurvey && (
              <p className="text-slate-500 text-sm mt-1">
                Period: {new Date(activeSurvey.start_date).toLocaleDateString()}
                {activeSurvey.end_date && ` - ${new Date(activeSurvey.end_date).toLocaleDateString()}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3"
        >
          <CheckCircle className="text-emerald-400" size={24} />
          <div>
            <p className="text-emerald-400 font-semibold">Response Submitted Successfully!</p>
            <p className="text-slate-300 text-sm">
              Thank you for your feedback. Your response has been recorded.
            </p>
          </div>
        </motion.div>
      )}

      {/* Already Responded Message */}
      {hasResponded && !submitted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-center gap-3"
        >
          <AlertCircle className="text-blue-400" size={24} />
          <div>
            <p className="text-blue-400 font-semibold">You've already responded today</p>
            <p className="text-slate-300 text-sm">
              You can update your response below. Your previous score: {latestResponse?.nps_score}/10 ({getScoreLabel(latestResponse?.nps_score)})
            </p>
          </div>
        </motion.div>
      )}

      {/* Survey Form */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Question */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              On a scale of 0 to 10, how likely are you to recommend working in this team to a friend or colleague?
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Select a number from 0 (not at all likely) to 10 (extremely likely)
            </p>

            {/* Score Selection */}
            <div className="flex flex-wrap gap-3 justify-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = npsScore === score;
                const label = getScoreLabel(score);
                const color = getScoreColor(score);
                
                return (
                  <motion.button
                    key={score}
                    type="button"
                    onClick={() => handleScoreClick(score)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative w-16 h-16 rounded-xl font-bold text-lg transition-all
                      ${isSelected 
                        ? color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' :
                          color === 'amber' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50' :
                          'bg-rose-500 text-white shadow-lg shadow-rose-500/50'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                      }
                    `}
                  >
                    {score}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2"
                      >
                        {color === 'emerald' ? (
                          <Smile className="text-emerald-400" size={20} />
                        ) : color === 'amber' ? (
                          <Star className="text-amber-400" size={20} />
                        ) : (
                          <Frown className="text-rose-400" size={20} />
                        )}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Score Label */}
            {npsScore !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 text-center p-4 rounded-xl ${
                  getScoreColor(npsScore) === 'emerald' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                  getScoreColor(npsScore) === 'amber' ? 'bg-amber-500/20 border border-amber-500/30' :
                  'bg-rose-500/20 border border-rose-500/30'
                }`}
              >
                <p className={`font-semibold ${
                  getScoreColor(npsScore) === 'emerald' ? 'text-emerald-400' :
                  getScoreColor(npsScore) === 'amber' ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {getScoreLabel(npsScore)} ({npsScore}/10)
                </p>
                <p className="text-slate-300 text-sm mt-1">
                  {npsScore >= 9 && 'You are a promoter - you love working here!'}
                  {npsScore >= 7 && npsScore < 9 && 'You are passive - satisfied but neutral.'}
                  {npsScore < 7 && 'You are a detractor - there are areas for improvement.'}
                </p>
              </motion.div>
            )}
          </div>

          {/* Squad Selection */}
          <div>
            <label htmlFor="squad" className="block text-sm font-medium text-slate-300 mb-2">
              Select Your Squad <span className="text-rose-400">*</span>
            </label>
            <select
              id="squad"
              value={selectedSquad || ''}
              onChange={(e) => {
                setSelectedSquad(e.target.value || null);
                setError(null);
              }}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select your squad --</option>
              {squads.map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.squad_name || squad.squad_key}
                </option>
              ))}
            </select>
            {loadingSquads && (
              <p className="text-slate-400 text-xs mt-1">Loading squads...</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-slate-300 mb-2">
              Comments (Optional)
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us more about your experience..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3"
            >
              <AlertCircle className="text-rose-400" size={24} />
              <p className="text-rose-400">{error}</p>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || npsScore === null || !selectedSquad}
              className={`
                px-8 py-3 rounded-xl font-semibold transition-all
                ${npsScore === null || isSubmitting || !selectedSquad
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                }
              `}
            >
              {isSubmitting ? 'Submitting...' : hasResponded ? 'Update Response' : 'Submit Response'}
            </button>
          </div>
        </form>
      </div>

      {/* Information Box */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">About eNPS</h3>
        <p className="text-slate-400 text-sm">
          <strong>Employee Net Promoter Score (eNPS)</strong> measures team satisfaction and engagement.
          <br />
          • <strong>Promoters (9-10):</strong> Highly satisfied, likely to recommend
          <br />
          • <strong>Passives (7-8):</strong> Satisfied but neutral
          <br />
          • <strong>Detractors (0-6):</strong> Less satisfied, unlikely to recommend
          <br />
          <br />
          Your responses help us improve team health and work environment. All responses are anonymous and confidential.
        </p>
      </div>
    </div>
  );
};

export default ENPSSurvey;

