import requests
import json
import csv
import pandas as pd

ProposalQuery = """ query Proposals {
  proposals(first: 300, skip: 0, where:{space:"gitcoindao.eth"}, orderBy: "created", orderDirection: desc) {
    id
    title
    body
    choices
    start
    end
    snapshot
    state
    author
    space {
      id
      name
    }
  }
}
"""

json_proposals_response = requests.get(f'https://hub.snapshot.org/graphql', headers={'Accept': 'application/json'},
                             json={'query': ProposalQuery})

dictr1 = json_proposals_response.json()
with open('graphqlproposals.json', 'w', encoding='UTF8') as f:
  json.dump(dictr1, f)


json_data = json.loads(json_proposals_response.text)

proposals_data = json_data["data"]["proposals"]
proposals_df = pd.DataFrame(proposals_data)
proposals_df.to_csv('proposals.csv', sep='\t')

for proposal in proposals_data:
    proposal_id = proposal["id"] 
    #append it 
    VotesQuery = ''' query Votes {
      votes(first: 1000, where: {proposal: "%s"}) {
        id
        voter
        created
        choice
        space {
          id
        }
      }
    }
    ''' % proposal_id

    json_response = requests.get(f'https://hub.snapshot.org/graphql', headers={'Accept': 'application/json'},
                                 json={'query': VotesQuery})
    new_votes_data = {"data" : {"votes" : []}}
    votes_data = json.loads(json_response.text)
    for vote in votes_data["data"]["votes"]:
      vote['proposal_id'] = proposal_id
      new_votes_data["data"]["votes"].append(vote)

 #   print(json_response.status_code)
  # open the file in the write mode
with open('graphql.json', 'w', encoding='UTF8') as f:
  json.dump(new_votes_data, f)
