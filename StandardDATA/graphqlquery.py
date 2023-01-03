import requests
import json
import pandas as pd

ProposalQuery = """ query Proposals {
  proposals(first: 2, skip: 0, where:{space:"gitcoindao.eth"}, orderBy: "created", orderDirection: desc) {
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

json_response = requests.get(f'https://hub.snapshot.org/graphql', headers={'Accept': 'application/json'},
                             json={'query': ProposalQuery})

print(json_response.status_code)
print(json_response.text)

json_data = json.loads(json_response.text)

proposals_data = json_data["data"]["proposals"]
proposals_df = pd.DataFrame(proposals_data)
print(proposals_df)

for proposal in proposals_data:
    proposal_id = proposal["id"]
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

    print(json_response.status_code)
    print(json_response.text)
