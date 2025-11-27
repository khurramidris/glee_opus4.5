import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SetupCompleteProps {
  onContinue: () => void;
}

export function SetupComplete({ onContinue }: SetupCompleteProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 p-8">
      <Card className="max-w-lg w-full text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-20 h-20 mx-auto mb-6 bg-green-600 rounded-full flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-surface-100 mb-2">
            You're All Set!
          </h1>
          <p className="text-surface-400 mb-8">
            Glee is ready. Start chatting with your first character.
          </p>

          {/* Quick Tips */}
          <div className="text-left space-y-3 mb-8">
            <TipItem
              number={1}
              text="Click on a character to start chatting"
            />
            <TipItem
              number={2}
              text="Create your own characters with custom personalities"
            />
            <TipItem
              number={3}
              text="Use branching to explore different conversation paths"
            />
          </div>

          <Button onClick={onContinue} size="lg" className="w-full">
            Start Chatting
          </Button>
        </motion.div>
      </Card>
    </div>
  );
}

function TipItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-700/50 rounded-lg">
      <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
        {number}
      </span>
      <span className="text-sm text-surface-300">{text}</span>
    </div>
  );
}
