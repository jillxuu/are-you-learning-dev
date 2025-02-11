import { useNavigate } from 'react-router-dom';
import CodeLearningView from '../components/CodeLearningView';
import { functionExplanations, moveKeywords } from '../data/memeContractData';
import memeContractCode from '@move/meme_coin.move';

export function LearnMemeContract() {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/editor');
  };

  return (
    <CodeLearningView
      code={memeContractCode}
      functionExplanations={functionExplanations}
      keywords={moveKeywords}
      onContinue={handleContinue}
    />
  );
} 
