// Committee working inventory 01. Statuses and domain relationships are
// provisional and intentionally separate from faculty-authored records.
(function () {
  const rows = [
    ['T01','AI-Assisted Design','Generative AI is becoming integrated into architectural ideation, representation, analysis, and technical problem-solving.','observed',['t1','t3','t6']],
    ['T02','Automation of Expertise','Computational systems are assuming tasks previously dependent on specialized technical knowledge and professional experience.','emerging',['t1','t3','t6']],
    ['T03','Information Saturation','The expanding availability of information and generated content is changing how knowledge is discovered, evaluated, and trusted.','observed',['t1','t5']],
    ['T04','Changing Standards of Authorship','AI-assisted production is challenging distinctions between original work, assistance, attribution, and intellectual ownership.','observed',['t1','t5','t6']],
    ['T05','Changing Student Preparedness','Differences in prior educational experiences, technical competencies, and learning expectations are creating new challenges for architectural instruction.','observed',['t1','t6']],
    ['T06','Material Resource Constraints','Resource availability, extraction impacts, and supply-chain vulnerabilities are drawing attention to the material consequences of construction.','observed',['t2','t3']],
    ['T07','Building Decarbonization','Environmental performance expectations increasingly include embodied carbon and construction-related emissions alongside operational energy.','observed',['t2','t3','t6']],
    ['T08','Adaptive Reuse and Retention','Extending the useful lives of existing buildings is gaining importance relative to demolition and replacement.','emerging',['t2','t4','t5']],
    ['T09','Circular Material Systems','Reuse, disassembly, material inventories, and recovery are challenging linear approaches to building production.','emerging',['t2','t3']],
    ['T10','Climate Adaptation','Environmental hazards are changing expectations for the resilience, durability, and adaptability of buildings.','observed',['t2','t4']],
    ['T11','Skilled Labor Shortages','Construction workforce shortages and changing labor demographics are affecting the capacity to deliver and maintain buildings.','observed',['t3','t4','t6']],
    ['T12','Industrialized Construction','Prefabrication, modularization, and manufacturing-based methods are renewing interest in industrialized building production.','emerging',['t3','t2']],
    ['T13','Construction Automation','Robotics, digitally controlled machinery, and automated fabrication systems are expanding their roles in building production.','emerging',['t3','t1']],
    ['T14','Human–Machine Collaboration','Increasingly capable digital systems are changing how technical precision, manual skill, and human judgment interact during production.','emerging',['t3','t1','t5']],
    ['T15','Distributed Production','Digital coordination and fabrication technologies may reorganize production across geographically distributed facilities and participants.','anticipated',['t3','t6']],
    ['T16','Housing Affordability Pressures','Housing costs, availability, and investment patterns are increasing demands for alternative approaches to housing provision.','observed',['t4','t3','t6']],
    ['T17','Demographic Change','Aging populations, migration, and changing household structures are reshaping demands for housing and civic infrastructure.','observed',['t4','t5']],
    ['T18','Changing Patterns of Occupancy','Remote work, hybrid employment, and evolving collective activities are changing expectations for the use and organization of space.','observed',['t4','t3']],
    ['T19','Accessibility and Inclusion','Changing expectations for equitable access are broadening how environments accommodate diverse users.','emerging',['t4','t6']],
    ['T20','Increasing Spatial Inequality','Uneven access to housing, infrastructure, and environmental amenities is intensifying questions about the distribution of architectural resources.','observed',['t4','t2','t6']],
    ['T21','Globalization of Design Production','International professional networks and digital methods are altering relationships between architectural knowledge and local contexts.','observed',['t5','t3','t6']],
    ['T22','Digital Cultural Homogenization','Common digital platforms and generative systems may standardize forms of architectural expression.','anticipated',['t5','t1']],
    ['T23','Renewed Interest in Traditional Knowledge','Ecological concerns and technological capabilities are encouraging reconsideration of traditional materials, techniques, and situated craft knowledge.','emerging',['t5','t2','t3']],
    ['T24','Changing Practices of Preservation','Reuse, adaptation, and evolving cultural values are broadening approaches to architectural heritage and conservation.','emerging',['t5','t2']],
    ['T25','Changing Cultural Representation','Digital media and new participation methods are altering how cultural identities and communities are represented in architectural processes.','emerging',['t5','t4','t1']],
    ['T26','Corporatization of Higher Education','Market-oriented administrative and financial models are changing university organization, governance, and priorities.','observed',['t6','t1']],
    ['T27','Economic Pressures on Education','Costs, enrollment patterns, funding, and perceptions of degree value are influencing academic programs.','observed',['t6','t1']],
    ['T28','Changing Professional Authority','Technology and evolving delivery models are altering the distribution of expertise and decisions across architectural practice.','emerging',['t6','t1','t3']],
    ['T29','Evolving Accreditation Expectations','Professional education is responding to changing expectations for competencies, ethical responsibilities, and preparation for practice.','emerging',['t6','t1']],
    ['T30','Expansion of Architectural Agency','Environmental, technological, and social changes may create roles for architects beyond conventional design services.','anticipated',['t6','t4','t2']]
  ];
  window.EpistemicInventory = rows.map(([code,label,detail,status,domains])=>({
    id:'inventory-'+code.toLowerCase(), code, label, detail, status,
    domains, type:'condition', seeded:true
  }));
})();
