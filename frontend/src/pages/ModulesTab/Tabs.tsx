import { useNavigate, useParams } from 'react-router-dom';

interface TabsProps {
  address: string;
  isObject: boolean;
}

export default function Tabs({ address, isObject }: TabsProps) {
  const navigate = useNavigate();
  const { selectedModuleName } = useParams();

  const tabs = [
    {
      label: 'Packages',
      path: `/modules/${address}/packages/${selectedModuleName || ''}`,
      active: window.location.pathname.includes('/packages/')
    },
    {
      label: 'Code',
      path: `/modules/${address}/code/${selectedModuleName || ''}`,
      active: window.location.pathname.includes('/code/')
    },
    {
      label: 'View Functions',
      path: `/modules/${address}/view/${selectedModuleName || ''}`,
      active: window.location.pathname.includes('/view/')
    },
    {
      label: 'Entry Functions',
      path: `/modules/${address}/run/${selectedModuleName || ''}`,
      active: window.location.pathname.includes('/run/')
    }
  ];

  return (
    <div className="tabs tabs-boxed bg-base-200">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          className={`tab ${tab.active ? 'tab-active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 
