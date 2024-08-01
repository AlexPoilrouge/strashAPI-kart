#!/usr/bin/python3

import yaml
from jinja2 import Environment, FileSystemLoader
import os
import argparse

def load_variables(file_path):
    with open(file_path) as file:
        return yaml.safe_load(file)

def render_template(template_path, variables):
    template_dir = os.path.dirname(template_path)
    template_file = os.path.basename(template_path)
    
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template(template_file)
    
    return template.render(variables)

def write_output(output_path, content):
    with open(output_path, 'w') as file:
        file.write(content)

def main(variables_path, template_path, output_path):
    variables = load_variables(variables_path)
    rendered_output = render_template(template_path, variables)
    write_output(output_path, rendered_output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate a file from a template and variables file.')
    parser.add_argument('variables', help='Path to the YAML variables file')
    parser.add_argument('template', help='Path to the Jinja2 template file')
    parser.add_argument('output', help='Path to the output file')

    args = parser.parse_args()

    main(args.variables, args.template, args.output)
