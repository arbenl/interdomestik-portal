import React from 'react';

interface DigitalMembershipCardProps {
  name: string;
  memberNo: string;
  region: string;
  validUntil: string;
}

const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({ name, memberNo, region, validUntil }) => {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-lg max-w-sm mx-auto">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold">Interdomestik</h2>
        <span className="text-xs font-mono bg-green-500 text-green-900 px-2 py-1 rounded">ACTIVE</span>
      </div>
      <div className="mt-8">
        <p className="text-sm text-gray-400">Member No.</p>
        <p className="text-2xl font-mono tracking-widest">{memberNo}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Name</p>
          <p className="font-medium">{name}</p>
        </div>
        <div>
          <p className="text-gray-400">Region</p>
          <p className="font-medium">{region}</p>
        </div>
        <div>
          <p className="text-gray-400">Valid Until</p>
          <p className="font-medium">{validUntil}</p>
        </div>
      </div>
    </div>
  );
};

export default DigitalMembershipCard;
